import express from 'express';
import {
    addFamilyMember,
    getFamilyMembers,
    updateFamilyMember,
    deleteFamilyMember
} from '../controllers/familyController.js';

import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 👨‍👩‍👧 Add new family member
router.post('/', protect, addFamilyMember);

// 📥 Get all family members of the logged-in user
router.get('/fetchFamilyMembers', protect, getFamilyMembers);

// 🛠️ Update specific family member by ID
router.put('/:familyMemberId', protect, updateFamilyMember);

// 🗑️ Delete specific family member by ID
router.delete('/:familyMemberId', protect, deleteFamilyMember);

export default router;
