// import nodemailer from 'nodemailer';

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: "sumitbangar53@gmail.com",
//     pass: "uoff wjmb gsub wexd", // App Password (keep safe)
//   },
// });

// const sendEmail = async (userEmail, OTP) => {
//   try {
//     const info = await transporter.sendMail({
//       from: '"Coding Craft" <sumitbangar53@gmail.com>',
//       to: userEmail,
//       subject: "Otp Verification",
//       text: "Your One Time Password is ",
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h2 style="color: #2d3748;">Password Recovery</h2>
//           <p>Your One Time Password for E-Cart Account:</p>
//           <div style="background: #f7fafc; padding: 16px; border-radius: 4px; 
//                       font-size: 24px; font-weight: bold; text-align: center; 
//                       margin: 16px 0; color: #2b6cb0;">
//             ${OTP}
//           </div>
//           <p><strong>Do not share this code with anyone.</strong></p>
//           <p style="color: #718096; font-size: 14px;">
//             If you didn't request this, please ignore this email.
//           </p>
//         </div>
//       `,
//     });
//   } catch (err) {
//     console.error('Email sending failed:', err.message);
//   }
// };

// export { sendEmail };

// src/utils/email.js (yahin par tumhara sendEmail function hai)

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
        throw err; // Error ko throw karna zaroori hai taaki calling function ko pata chale
    }
};

export { sendEmail };