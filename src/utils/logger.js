import { sendEmail } from '../config/emailConfig.js';
import Logs from '../models/logs.js';
export const generateLogAndSendEmail = async (email, action, status, message, adminEmailForNotification) => {
    try {
        await Logs.create({ email, action, status, message });
        if (status === 'failed' && adminEmailForNotification) {
            const subject = 'Security Alert: Admin Panel Access Attempt';
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d32f2f;">Security Alert!</h2>
                    <p>Dear Admin,</p>
                    <p>Someone attempted to access your admin panel account with the email: <strong>${email}</strong>.</p>
                    <p>Details: <strong>${message}</strong></p>
                    <p style="color: #718096;">If this was you, please ignore this email. If not, please change your password immediately.</p>
                    <p style="color: #718096; font-size: 14px;">Timestamp: ${new Date().toLocaleString()}</p>
                </div>
            `;
            await sendEmail(adminEmailForNotification, subject, '', htmlContent);
            console.log(`Controller: Security alert email sent to ${adminEmailForNotification}`);
        }
    } catch (emailErr) {
        console.error('Controller: Failed to send security alert email:', emailErr.message);
    }
};