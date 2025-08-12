import express from 'express';
import {
    adminLogin, verifyAdminOtp, getAllUsers, getSingleUserWithFamilyMembers,
    deleteUser, getAllFamilyMembers, getSingleFamilyMember, deleteFamilyMember
} from '../controllers/adminController.js';
import { adminProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin Authentication Routes (No protection)
router.post('/auth/login', adminLogin);
router.post('/auth/verify-otp', verifyAdminOtp);

// Admin Protected Routes
router.use(adminProtect); // Protection for all routes below this

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getSingleUserWithFamilyMembers);
router.delete('/users/:id', deleteUser); // Cleaned up route

// Family Member Management
router.get('/family-members', getAllFamilyMembers);
router.get('/family-members/:id', getSingleFamilyMember);
router.delete('/family-members/:id', deleteFamilyMember); // Cleaned up route

export default router;