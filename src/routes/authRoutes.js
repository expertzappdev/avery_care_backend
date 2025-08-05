import express from 'express';
import { registerUser, verifyOtp, loginUser } from '../controllers/authController.js';
const router = express.Router();

// Registration route
router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
// Login route
router.post('/login', loginUser);


export default router;