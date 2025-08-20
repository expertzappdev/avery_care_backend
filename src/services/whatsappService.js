import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !twilioWhatsAppNumber) {
    console.error("Twilio credentials .env file mein set nahi hain. WhatsApp feature kaam nahi karega.");
}

const client = twilio(accountSid, authToken);

/**
 * User ko call se pehle ek interactive WhatsApp reminder bhejta hai.
 * @param {string} recipientNumber - Recipient ka phone number.
 * @param {string} recipientName - Recipient ka naam.
 * @param {Date} callTime - Scheduled call ka time.
 */
export const sendWhatsAppReminder = async (recipientNumber, recipientName, callTime) => {
    console.log(`--- [LOG] sendWhatsAppReminder function shuru hua ---`);
    console.log(`--- [LOG] Recipient: ${recipientName}, Number: ${recipientNumber}`);

    try {
        const to = `whatsapp:${recipientNumber}`;
        const from = twilioWhatsAppNumber;

        const formattedTime = callTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });

        // Naya interactive message body
        const body = `Namaste ${recipientName}, Avery Care se reminder.\n\nAapki health call aaj ${formattedTime} baje hai.\n\nReply karein:\n- 'CONFIRM' agar aap available hain.\n- 'RESCHEDULE DD/MM/YYYY HH:MM' agar aap call ko naye time par set karna chahte hain (jaise 'RESCHEDULE 20/08/2024 18:45').`;

        console.log(`--- [LOG] Twilio ko message bhejne ki taiyari...`);

        const message = await client.messages.create({ from, body, to });

        console.log(`✅✅✅ [SUCCESS] Interactive WhatsApp reminder safaltapoorvak bheja gaya. SID: ${message.sid}`);
        return message.sid;

    } catch (error) {
        console.error(`❌❌❌ [ERROR] WhatsApp reminder ${recipientNumber} par bhejne mein fail hua:`, error.message);
        throw error;
    }
};

/**
 * User ko ek standard WhatsApp message bhejta hai.
 * @param {string} recipientNumber - Recipient ka phone number (bina 'whatsapp:' prefix ke).
 * @param {string} messageBody - Bheja jaane wala message.
 */
export const sendWhatsAppReply = async (recipientNumber, messageBody) => {
    try {
        const to = `whatsapp:${recipientNumber}`;
        const from = twilioWhatsAppNumber;
        await client.messages.create({ from, body: messageBody, to });
        console.log(`WhatsApp reply to ${recipientNumber} safaltapoorvak bheja gaya.`);
    } catch (error) {
        console.error(`WhatsApp reply to ${recipientNumber} bhejne mein fail hua:`, error.message);
    }
};
