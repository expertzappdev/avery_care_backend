import twilio from 'twilio';
import ScheduledCall from '../models/scheduledCallSummary.js';
import { scheduleNewCall } from '../jobs/callScheduler.js';
// sendWhatsAppReply ki ab yahan zaroorat nahi hai
// import { sendWhatsAppReply } from '../services/whatsappService.js';

const { twiml } = twilio;

/**
 * User ke diye gaye DD/MM/YYYY HH:MM string se Date object banata hai.
 * @param {string} dateTimeString - "DD/MM/YYYY HH:MM" format mein string.
 * @returns {Date|null} - Agar format sahi hai toh Date object, varna null.
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
 * Twilio se aane wale incoming WhatsApp replies ko handle karta hai.
 */
export const handleWhatsAppReply = async (req, res) => {
    const userReply = req.body.Body?.trim();
    const userNumber = req.body.From.replace('whatsapp:', '');
    const twimlResponse = new twiml.MessagingResponse(); // Twilio ke liye response object

    console.log(`Incoming WhatsApp reply from ${userNumber}: "${userReply}"`);

    try {
        const call = await ScheduledCall.findOne({
            recipientNumber: userNumber,
            status: 'pending'
        }).sort({ scheduledAt: 1 });

        if (!call) {
            console.log(`No pending call found for ${userNumber}. Ignoring reply.`);
            twimlResponse.message("Maaf kijiye, aapke number ke liye koi active scheduled call nahi mili.");
            return res.type('text/xml').send(twimlResponse.toString());
        }

        if (userReply.toUpperCase() === 'CONFIRM') {
            twimlResponse.message("Dhanyavaad! Hum aapse scheduled time par hi baat karenge.");

        } else if (userReply.toUpperCase().startsWith('RESCHEDULE ')) {
            const dateTimeString = userReply.substring(11).trim();
            const newTime = parseDateTime(dateTimeString);

            // Step 1: Format check karna
            if (!newTime) {
                twimlResponse.message("Galat format. Kripya 'RESCHEDULE DD/MM/YYYY HH:MM' format mein reply karein (jaise RESCHEDULE 20/08/2025 18:30).");
            } else {
                // Step 2: Past time check karna
                const fiveMinutesFromNow = new Date(new Date().getTime() + 5 * 60 * 1000);
                if (newTime <= fiveMinutesFromNow) {
                    twimlResponse.message("Aapne past ka ya bahut nazdeek ka time daala hai. Kripya aane wala time daalein jo ab se kam se kam 5 minute baad ka ho.");
                } else {
                    // Step 3: Sab kuch sahi hai, reschedule karke confirmation bhejna
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
            // Default reply
            twimlResponse.message("Maaf kijiye, hum aapka jawab samajh nahi paaye. Kripya 'CONFIRM' ya 'RESCHEDULE DD/MM/YYYY HH:MM' format mein reply karein.");
        }

        // Final response Twilio ko bhejein
        res.type('text/xml').send(twimlResponse.toString());

    } catch (error) {
        console.error("WhatsApp reply handle karne mein error:", error);
        // Error ke case mein Twilio ko khaali response bhejein taaki default message na aaye
        res.type('text/xml').status(500).send(new twiml.MessagingResponse().toString());
    }
};

