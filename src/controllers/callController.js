import pkg from 'twilio';
const { twiml } = pkg;
import { GoogleGenerativeAI } from "@google/generative-ai";
import ScheduledCall from '../models/scheduledCallSummary.js';
import User from '../models/user.js';
import twilioClient from '../config/twilio.js';
import { scheduleNewCall } from '../jobs/callScheduler.js';
import FamilyMember from '../models/familyMember.js';

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY .env file mein set nahi hai.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const conversationHistories = new Map();

const systemInstruction = {
    role: "system",
    parts: [{
        text: "You are a friendly and health assistant AI of Avery Care. Your purpose is to check in on a user, ask about their general health and well-being, and provide helpful, supportive information. Do not provide medical advice. Keep your responses short, suitable for a phone call."
    }],
};

function getOrCreateConversationHistory(callSid) {
    if (!conversationHistories.has(callSid)) {
        conversationHistories.set(callSid, []);
    }
    return conversationHistories.get(callSid);
}

export const triggerCall = async (phoneNumber, callId) => {
    try {
        console.log(`Controller: triggerCall function shuru. Phone number: ${phoneNumber}, Call ID: ${callId}`);
        const voiceUrl = `${process.env.PUBLIC_URL}/api/calls/voice?callId=${callId}`;
        const statusCallbackUrl = `${process.env.PUBLIC_URL}/api/calls/status`;
        console.log(`Controller: Twilio call jaa rahi hai. Webhook URL: ${voiceUrl}, Status Callback: ${statusCallbackUrl}`);

        const call = await twilioClient.calls.create({
            url: voiceUrl,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            statusCallback: statusCallbackUrl, // Twilio ko status update bhejne ke liye kaha gaya hai
            statusCallbackEvent: ['answered', 'completed', 'failed', 'no-answer'],
            statusCallbackMethod: 'POST',
        });

        console.log(`Controller: Twilio call shuru ho gayi. SID: ${call.sid}`);

        await ScheduledCall.findByIdAndUpdate(callId, {
            status: 'in-progress',
            callSid: call.sid,
            startTime: new Date(),
        });
        console.log(`Controller: Database mein Call ID ${callId} updated.`);

        return call.sid;
    } catch (error) {
        console.error(`Controller: triggerCall mein ERROR: ${error.message}`);
        throw error;
    }
};

export const makeCall = async (req, res) => {
    try {
        console.log("Controller: makeCall API hit hua.");
        const { to } = req.body;
        if (!to) {
            console.error('Controller: "to" phone number missing hai.');
            return res.status(400).json({ message: '"to" phone number zaroori hai.' });
        }
        const callSid = await triggerCall(to);
        res.status(200).json({ message: `Call shuru ho gayi. SID: ${callSid}` });
    } catch (error) {
        console.error('Controller: makeCall controller mein ERROR:', error);
        res.status(500).json({ message: 'Call shuru karne mein fail hua.' });
    }
};

export const handleVoice = async (req, res) => {
    const twimlResponse = new twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const callId = req.query.callId;

    try {
        console.log(`Controller: handleVoice webhook hit. Call SID: ${callSid}, Call ID: ${callId}`);
        const history = getOrCreateConversationHistory(callSid);

        const chat = geminiModel.startChat({
            history: history,
            systemInstruction: systemInstruction,
        });

        console.log("Controller: Gemini se pehla message generate kar rahe hain...");
        const result = await chat.sendMessage("Start the conversation by introducing yourself and asking me how I'm doing.");
        const aiResponse = result.response.text();
        console.log(`Controller: Gemini ka pehla sandesh: "${aiResponse}"`);

        history.push({ role: 'model', parts: [{ text: aiResponse }] });

        if (callId) {
            await ScheduledCall.findByIdAndUpdate(callId, {
                $push: { transcript: { role: 'assistant', message: aiResponse } }
            });
            console.log(`Controller: Database mein AI ka pehla message store hua.`);
        }

        const gather = twimlResponse.gather({
            input: 'speech',
            speechTimeout: 'auto',
            action: `/api/calls/handle-speech?callId=${callId}`,
            method: 'POST',
        });

        gather.say({ voice: 'Polly.Joanna' }, aiResponse);
        twimlResponse.redirect({ method: 'POST' }, `/api/calls/voice?callId=${callId}`);

        res.type('text/xml');
        res.send(twimlResponse.toString());
    } catch (error) {
        console.error('Controller: handleVoice webhook mein ERROR:', error);
        const errorResponse = new twiml.VoiceResponse();
        errorResponse.say({ voice: 'Polly.Joanna' }, 'Maaf kijiye, ek application error aa gayi hai. Goodbye.');
        res.type('text/xml').status(500).send(errorResponse.toString());
    }
};

export const handleSpeech = async (req, res) => {
    const twimlResponse = new twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const userInput = req.body.SpeechResult;
    const callId = req.query.callId;

    try {
        console.log(`Controller: handleSpeech webhook hit. Call SID: ${callSid}, User input: "${userInput}", Call ID: ${callId}`);
        const history = getOrCreateConversationHistory(callSid);

        if (userInput && callId) {
            await ScheduledCall.findByIdAndUpdate(callId, {
                $push: { transcript: { role: 'user', message: userInput } }
            });
            console.log(`Controller: Database mein user ka message store hua.`);
        }

        if (userInput) {
            history.push({ role: 'user', parts: [{ text: userInput }] });

            const chat = geminiModel.startChat({
                history: history,
                systemInstruction: systemInstruction,
            });

            console.log("Controller: Gemini se user input ke liye jawab generate kar rahe hain...");
            const result = await chat.sendMessage(userInput);
            const aiResponse = result.response.text();
            console.log(`Controller: Gemini ka jawab: "${aiResponse}"`);

            history.push({ role: 'model', parts: [{ text: aiResponse }] });

            if (callId) {
                await ScheduledCall.findByIdAndUpdate(callId, {
                    $push: { transcript: { role: 'assistant', message: aiResponse } }
                });
                console.log(`Controller: Database mein AI ka jawab store hua.`);
            }

            const gather = twimlResponse.gather({
                input: 'speech',
                speechTimeout: 'auto',
                action: `/api/calls/handle-speech?callId=${callId}`,
                method: 'POST',
            });

            gather.say({ voice: 'Polly.Joanna' }, aiResponse);
        } else {
            console.log("Controller: User ne kuch nahi bola.");
            twimlResponse.say({ voice: 'Polly.Joanna' }, "Maine theek se suna nahi. Kya aap dobara bol sakte hain?");
            twimlResponse.gather({
                input: 'speech',
                speechTimeout: 'auto',
                action: `/api/calls/handle-speech?callId=${callId}`,
                method: 'POST',
            });
        }

        res.type('text/xml');
        res.send(twimlResponse.toString());
    } catch (error) {
        console.error('Controller: handleSpeech webhook mein ERROR:', error);
        const errorResponse = new twiml.VoiceResponse();
        errorResponse.say({ voice: 'Polly.Joanna' }, 'Lagta hai kuch takneeki samasya aa gayi hai. Kripya baad mein prayas karein.');
        res.type('text/xml').status(500).send(errorResponse.toString());
    }
};

// export const handleCallStatus = async (req, res) => {
//     const callSid = req.body.CallSid;
//     const callStatus = req.body.CallStatus;
//     const callDuration = req.body.CallDuration;

//     try {
//         console.log(`Controller: handleCallStatus webhook hit. Call SID: ${callSid}, Status: ${callStatus}`);
//         const scheduledCall = await ScheduledCall.findOne({ callSid });
//         if (!scheduledCall) {
//             console.error(`Controller: Scheduled call with SID ${callSid} not found.`);
//             return res.status(404).send();
//         }

//         const updates = {};
//         let shouldReschedule = false;

//         if (callStatus === 'completed' && parseInt(callDuration, 10) > 0) {
//             console.log(`Controller: Call ID ${scheduledCall._id} answered. Status 'completed' par set kar rahe hain.`);
//             updates.status = 'completed';
//             updates.endTime = new Date();
//             updates.durationInSeconds = parseInt(callDuration, 10);
//             updates.triesLeft = 0;
//         }
//         else if (callStatus === 'no-answer' || callStatus === 'failed' || (callStatus === 'completed' && parseInt(callDuration, 10) === 0)) {
//             updates.triesLeft = scheduledCall.triesLeft - 1;
//             console.log(`Controller: Call ID ${scheduledCall._id} failed/not answered. TriesLeft updated to ${updates.triesLeft}.`);

//             if (updates.triesLeft <= 0) {
//                 console.log(`Controller: Call ID ${scheduledCall._id} failed. TriesLeft 0 hai, isliye call finaly 'failed' ho gaya.`);
//                 updates.status = 'failed';
//                 updates.endTime = new Date();
//             } else {
//                 const nextAttemptTime = new Date();
//                 nextAttemptTime.setMinutes(nextAttemptTime.getMinutes() + 15); // Yahan 5 se 15 minutes kar diya gaya hai

//                 updates.scheduledAt = nextAttemptTime;
//                 updates.$push = { scheduledAtHistory: nextAttemptTime };
//                 updates.status = 'pending';
//                 shouldReschedule = true;
//                 console.log(`Controller: Call ID ${scheduledCall._id} ko naye time (${nextAttemptTime.toISOString()}) par dobara schedule kiya gaya hai.`);
//             }
//         }
//         else {
//             console.log(`Controller: Call ID ${scheduledCall._id} ka status unhandled: ${callStatus}. Koi update nahi.`);
//         }

//         await ScheduledCall.updateOne({ _id: scheduledCall._id }, updates);
//         console.log(`Controller: Database mein Call ID ${scheduledCall._id} status updated to ${updates.status}.`);

//         if (shouldReschedule) {
//             const updatedCall = await ScheduledCall.findById(scheduledCall._id);
//             if (updatedCall) {
//                 scheduleNewCall(updatedCall);
//             }
//         }

//         res.status(200).send();
//     } catch (err) {
//         console.error('Controller: handleCallStatus mein ERROR:', err.message);
//         res.status(500).send();
//     }
// };


export const handleCallStatus = async (req, res) => {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    const callDuration = req.body.CallDuration;

    try {
        console.log(`Controller: handleCallStatus webhook hit. Call SID: ${callSid}, Status: ${callStatus}`);
        const scheduledCall = await ScheduledCall.findOne({ callSid });
        
        if (!scheduledCall) {
            console.error(`Controller: Scheduled call with SID ${callSid} not found.`);
            return res.status(404).send();
        }

        const updates = {};
        let shouldReschedule = false;

        // Condition for a successful call
        if (callStatus === 'completed' && parseInt(callDuration, 10) > 0) {
            console.log(`Controller: Call ID ${scheduledCall._id} was answered. Setting status to 'completed'.`);
            updates.status = 'completed';
            updates.endTime = new Date();
            updates.durationInSeconds = parseInt(callDuration, 10);
            updates.triesLeft = 0;
        } 
        // Conditions for a failed/unanswered call
        else if (callStatus === 'no-answer' || callStatus === 'failed' || (callStatus === 'completed' && parseInt(callDuration, 10) === 0)) {
            updates.triesLeft = scheduledCall.triesLeft - 1;
            console.log(`Controller: Call ID ${scheduledCall._id} failed/not answered. TriesLeft updated to ${updates.triesLeft}.`);

            if (updates.triesLeft <= 0) {
                console.log(`Controller: Call ID ${scheduledCall._id} failed. TriesLeft is 0, setting final status to 'failed'.`);
                updates.status = 'failed';
                updates.endTime = new Date();
            } else {
                // Set status to 'in-progress' for subsequent retries
                updates.status = 'in-progress'; 
                const nextAttemptTime = new Date();
                nextAttemptTime.setMinutes(nextAttemptTime.getMinutes() + 15);

                updates.scheduledAt = nextAttemptTime;
                updates.$push = { scheduledAtHistory: nextAttemptTime };
                shouldReschedule = true;
                console.log(`Controller: Call ID ${scheduledCall._id} rescheduled for new time: ${nextAttemptTime.toISOString()}`);
            }
        }
        else {
            console.log(`Controller: Call ID ${scheduledCall._id} received an unhandled status: ${callStatus}. No update will be made.`);
        }

        await ScheduledCall.updateOne({ _id: scheduledCall._id }, updates);
        console.log(`Controller: Database updated for Call ID ${scheduledCall._id}. New status: ${updates.status}.`);

        if (shouldReschedule) {
            const updatedCall = await ScheduledCall.findById(scheduledCall._id);
            if (updatedCall) {
                scheduleNewCall(updatedCall);
            }
        }

        res.status(200).send();
    } catch (err) {
        console.error('Controller: Error in handleCallStatus:', err.message);
        res.status(500).send();
    }
};

export const createScheduledCall = async (req, res) => {
    try {
        console.log("createScheduledCall API hit.");
        const { scheduledTo, scheduledAt } = req.body;
        if (!scheduledTo || !scheduledAt) {
            console.error("Missing required fields (scheduledTo or scheduledAt).");
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const scheduledBy = req.user._id;
        console.log("User ID se family member check kar rahe hain.");
        const user = await User.findById(scheduledBy).select('familyMembers');
        if (!user) {
            console.error('Controller: User not found.');
            return res.status(404).json({ message: 'User not found' });
        }

        const isLinked = user.familyMembers.some((fm) =>
            fm.member.toString() === scheduledTo
        );
        if (!isLinked) {
            console.error(`Family member ID ${scheduledTo} user se linked nahi hai.`);
            return res
                .status(400)
                .json({ message: 'This family member is not linked to the user cannot schedule call' });
        }

        const receiver = await FamilyMember.findById(scheduledTo);
        if (!receiver || !receiver.phoneNumber) {
            console.error('Controller: Receiver user ya phone number nahi mila.');
            return res.status(404).json({ message: 'Receiver user or phone number not found' });
        }

        const initialScheduledAt = new Date(scheduledAt);

        const newCall = await ScheduledCall.create({
            scheduledBy,
            scheduledTo,
            recipientNumber: receiver.phoneNumber,
            scheduledAt: initialScheduledAt,
            triesLeft: 3, 
            scheduledAtHistory: [initialScheduledAt],
        });

        console.log(`Controller: Naya call schedule ho gaya. Call ID: ${newCall._id}`);

        scheduleNewCall(newCall);

        res.status(201).json({
            message: 'Call scheduled successfully',
            scheduledCall: newCall,
        });
    } catch (err) {
        console.error('Controller: Error scheduling call:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateScheduledCall = async (req, res) => {
    try {
        const { id, scheduledAt } = req.body;
        console.log(`Controller: Attempting to update scheduled call with ID: ${id}`);

        if (!id || !scheduledAt) {
            console.error('Controller: Missing required fields for updating scheduled call.');
            return res.status(400).json({ message: 'ID and scheduledAt are required.' });
        }
        
        const call = await ScheduledCall.findById(id);

        if (!call) {
            console.log(`Controller: Scheduled call with ID ${id} not found.`);
            // User requested a specific message for this case
            return res.status(404).json({ message: 'No call scheduled for this user.' }); 
        }

        if (call.status !== 'pending') {
            console.log(`Controller: Call status is not pending. Cannot update. Current status: ${call.status}`);
            return res.status(400).json({ message: `Cannot update call. Status is ${call.status}.` });
        }

        // Agar sab sahi hai, to scheduledAt ko update karo
        const newScheduledAt = new Date(scheduledAt);
        call.scheduledAt = newScheduledAt;
        call.scheduledAtHistory.push(newScheduledAt);

        await call.save();
        
        console.log(`Controller: Successfully updated scheduled call with ID: ${id}. New scheduled time: ${call.scheduledAt.toISOString()}`);
        
        // Naye time ke liye call ko reschedule karo
        scheduleNewCall(call);

        res.status(200).json({
            status: 'success',
            message: 'Scheduled call updated successfully.',
            data: { call },
        });

    } catch (error) {
        console.error('Controller: Error updating scheduled call.', error.message);
        res.status(500).json({ message: 'Server error updating scheduled call.' });
    }
};

export const deleteScheduledCall = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Controller: Attempting to delete scheduled call with ID: ${id}`);

        if (!id) {
            return res.status(400).json({ message: 'Call ID is required for deletion.' });
        }

        const deletedCall = await ScheduledCall.findByIdAndDelete(id);

        if (!deletedCall) {
            console.log(`Controller: Scheduled call with ID ${id} not found.`);
            return res.status(404).json({ message: 'Scheduled call not found.' });
        }

        console.log(`Controller: Successfully deleted scheduled call with ID: ${id}.`);

        res.status(200).json({
            status: 'success',
            message: 'Scheduled call deleted successfully.',
            data: { deletedCall },
        });

    } catch (error) {
        console.error('Controller: Error deleting scheduled call.', error.message);
        res.status(500).json({ message: 'Server error deleting scheduled call.' });
    }
};
