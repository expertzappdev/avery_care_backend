
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "sumitbangar53@gmail.com",
        pass: "uoff wjmb gsub wexd", // App Password (keep safe)
    },
});

const sendEmail = async (userEmail, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: '"Coding Craft" <sumitbangar53@gmail.com>',
            to: userEmail,
            subject: subject,
            text: text,
            html: html,
        });
        console.log("Email sent: %s", info.messageId);
    } catch (err) {
        console.error('Email sending failed:', err.message);
        throw err; 
    }
};

export default { sendEmail }
