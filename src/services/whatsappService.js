import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;


// Check if Twilio credentials are set in .env file
if (!accountSid || !authToken || !twilioWhatsAppNumber) {
    console.error("Twilio credentials .env file mein set nahi hain. WhatsApp feature kaam nahi karega.");
}

// Initialize the Twilio client
const client = twilio(accountSid, authToken);

/**
 * Sends a WhatsApp reminder to the user before the call.
 * @param {string} recipientNumber - Recipient's phone number (with country code, e.g., +91XXXXXXXXXX).
 * @param {string} recipientName - Recipient's name.
 * @param {Date} callTime - Scheduled call time.
 * @returns {Promise<string>} - Twilio message SID.
 */
export const sendWhatsAppReminder = async (recipientNumber, recipientName, callTime) => {
    // DEBUG LOG 1: At the start of the function
    console.log(`--- [LOG] sendWhatsAppReminder function shuru hua ---`);
    console.log(`--- [LOG] Recipient: ${recipientName}, Number: ${recipientNumber}`);

    try {
        // Format the number for WhatsApp
        const to = `whatsapp:${recipientNumber}`;
        const from = twilioWhatsAppNumber;

        // Customize the message body
        const formattedTime = callTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
        const body = `Namaste ${recipientName}, Avery Care se yeh ek friendly reminder hai. Aapki scheduled health check-in call 10 minute mein, lagbhag ${formattedTime} baje hai.`;

        // DEBUG LOG 2: Just before sending the message
        console.log(`--- [LOG] Twilio ko message bhejne ki taiyari...`);
        console.log(`   -> From: ${from}`);
        console.log(`   -> To: ${to}`);
        console.log(`   -> Body: "${body}"`);

        const message = await client.messages.create({ from, body, to });

        // DEBUG LOG 3: Upon successful message delivery
        console.log(`✅✅✅ [SUCCESS] WhatsApp reminder safaltapoorvak bheja gaya. SID: ${message.sid}`);
        return message.sid;

    } catch (error) {
        // DEBUG LOG 4: If any error occurs during sending
        console.error(`❌❌❌ [ERROR] WhatsApp reminder ${recipientNumber} par bhejne mein fail hua:`, error.message);
        console.error("--- [Full Twilio Error Object] ---", error); // Log the full error object
        throw error; // Re-throw the error
    }
};