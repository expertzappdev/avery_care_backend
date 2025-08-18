import express from 'express';
import {
    addFamilyMember,
    getFamilyMembers,
    updateFamilyMember,
    deleteFamilyMember,
} from '../controllers/familyController.js';

import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect)
// 👨‍👩‍👧 Add new family member
router.post('/', addFamilyMember);

// 📥 Get all family members of the logged-in user
router.get('/fetchFamilyMembers', getFamilyMembers);

// 🛠️ Update specific family member by ID
router.put('/:familyMemberId', updateFamilyMember);

// 🗑️ Delete specific family member by ID
router.delete('/:familyMemberId', deleteFamilyMember);

export default router;
