// src/config/twilio.js
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials (.env file mein) set nahi hain.');
}
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
// module.exports = twilioClient;
export default twilioClient;
