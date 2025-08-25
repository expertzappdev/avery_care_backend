import twilio from 'twilio';
import ScheduledCall from '../models/scheduledCallSummary.js';
import { scheduleNewCall } from '../jobs/callScheduler.js';

const { twiml } = twilio;

/**
 * User DD/MM/YYYY HH:MM string Date object .
 * @param {string} dateTimeString - "DD/MM/YYYY HH:MM" format string.
 * @returns {Date|null} - if formated Date object, otherwise null.
 */
const parseDateTime = (dateTimeString) => {
    const parts = dateTimeString.match(/^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/);
    if (!parts) {
        return null; // Format galat hai
    }
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // JS mein month 0 se start hota hai
    const year = parseInt(parts[3], 10);
    const hours = parseInt(parts[4], 10);
    const minutes = parseInt(parts[5], 10);

    const date = new Date(year, month, day, hours, minutes);

    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }

    return date;
};


/**
 * Twilio incoming WhatsApp replies handle .
 */
export const handleWhatsAppReply = async (req, res) => {
    const userReply = req.body.Body?.trim();
    const userNumber = req.body.From.replace('whatsapp:', '');
    const twimlResponse = new twiml.MessagingResponse();

    // --- DEBUG LOG 1: Message receive hua ---
    console.log(`[LOG] Incoming WhatsApp reply from ${userNumber}: "${userReply}"`);

    try {
        const call = await ScheduledCall.findOne({
            recipientNumber: userNumber,
            status: 'pending'
        }).sort({ scheduledAt: 1 });

        if (!call) {
            // --- DEBUG LOG 2: Koi pending call nahi mili ---
            console.log(`[LOG] No pending call found for ${userNumber}.`);
            twimlResponse.message("Maaf kijiye, aapke number ke liye koi active scheduled call nahi mili.");
            return res.type('text/xml').send(twimlResponse.toString());
        }

        // --- DEBUG LOG 3: Pending call mil gayi ---
        console.log(`[LOG] Found pending call ID: ${call._id} for number ${userNumber}`);

        if (userReply.toUpperCase() === 'CONFIRM') {
            console.log(`[LOG] User ne 'CONFIRM' kiya.`);
            twimlResponse.message("Dhanyavaad! Hum aapse scheduled time par hi baat karenge.");

        } else if (/^RESCHEDULE\s/i.test(userReply)) { // <-- YEH HAI FIX!
            console.log(`[LOG] User ne 'RESCHEDULE' request kiya.`);
            // Naye tareeke se date/time string nikalein
            const dateTimeString = userReply.replace(/^RESCHEDULE\s/i, '').trim();
            const newTime = parseDateTime(dateTimeString);

            if (!newTime) {
                // --- DEBUG LOG 4: Format galat hai ---
                console.log(`[LOG] Invalid date/time format: "${dateTimeString}"`);
                twimlResponse.message("Galat format. Kripya 'RESCHEDULE DD/MM/YYYY HH:MM' format mein reply karein (jaise RESCHEDULE 20/08/2025 18:30).");
            } else {
                const fiveMinutesFromNow = new Date(new Date().getTime() + 5 * 60 * 1000);
                if (newTime <= fiveMinutesFromNow) {
                    // --- DEBUG LOG 5: Past ka time hai ---
                    console.log(`[LOG] User ne past ka time diya: ${newTime.toISOString()}`);
                    twimlResponse.message("Aapne past ka ya bahut nazdeek ka time daala hai. Kripya aane wala time daalein jo ab se kam se kam 5 minute baad ka ho.");
                } else {
                    // --- DEBUG LOG 6: Sab kuch sahi, reschedule kar rahe hain ---
                    console.log(`[LOG] Rescheduling call to: ${newTime.toISOString()}`);
                    call.scheduledAt = newTime;
                    call.scheduledAtHistory.push(newTime);
                    await call.save();

                    scheduleNewCall(call);

                    const formattedNewTime = newTime.toLocaleString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                    });
                    twimlResponse.message(`Aapki call safaltapoorvak reschedule ho gayi hai. Aapka naya call time hai: ${formattedNewTime}`);
                }
            }
        } else {
            // --- DEBUG LOG 7: Jawab samajh nahi aaya ---
            console.log(`[LOG] User ka jawab samajh nahi aaya: "${userReply}"`);
            twimlResponse.message("Maaf kijiye, hum aapka jawab samajh nahi paaye. Kripya 'CONFIRM' ya 'RESCHEDULE DD/MM/YYYY HH:MM' format mein reply karein.");
        }

        res.type('text/xml').send(twimlResponse.toString());

    } catch (error) {
        console.error("[ERROR] WhatsApp reply handle karne mein error:", error);
        res.type('text/xml').status(500).send(new twiml.MessagingResponse().toString());
    }
};
