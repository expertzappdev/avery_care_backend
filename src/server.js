import app from './app.js'; // import the express app
import connectDB from './config/db.js'; // import the db connection utility
import { startScheduler } from './jobs/callScheduler.js';
import dotenv from 'dotenv';

// const createDefaultAdmin = async () => {
//   try {
//     const email = 'admin@gmail.com';
//     const plainPassword = 'admin123'; 

//     
//     // const existingAdmin = await Admin.findOne({ email });
//     // if (existingAdmin) {
//     //     console.log('✅ Admin already exists. Skipping creation.');
//     //     return;
//     // }

//     
//     const hashedPassword = await bcrypt.hash(plainPassword, 10);

//     
//     const newAdmin = await Admin.create({
//       email,
//       password: hashedPassword,
//       role: 'admin',
//     });

//     console.log('🎉 Admin created successfully:', newAdmin.email);
//   } catch (err) {
//     console.error('❌ Error creating admin:', err);
//   }
// };
// createDefaultAdmin()

// import * as admin from 'firebase-admin';
// import serviceAccount from './twiliohealthcarebackend-firebase-adminsdk-fbsvc-78a1f9df51.json';
dotenv.config();
connectDB();
const PORT = process.env.PORT || 5000;

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   storageBucket: "your-project-id.appspot.com" // Apne storage bucket ka URL yahan daalo
// });

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  startScheduler()
});




