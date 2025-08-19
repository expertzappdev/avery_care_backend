import express from 'express';
import {
    getUsers, getSingleUserWithFamilyMembers, deleteUser,
    familyMembers, getSingleFamilyMember, deleteFamilyMember,
    getScheduledCalls, deleteScheduledCall
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Admin Protected Routes
router.use(protect, adminOnly);

// User Management
router.get('/users', getUsers);

router.get('/user/:id', getSingleUserWithFamilyMembers);

router.delete('/user/:id', deleteUser);

// Family Member Management

router.get('/familyMembers', familyMembers);

router.get('/familyMember/:id', getSingleFamilyMember);

router.delete('/familyMember/:id', deleteFamilyMember);

// Call Management 

router.get('/scheduledCalls', getScheduledCalls);

router.delete('/deleteScheduledCall/:id', deleteScheduledCall);

export default router;