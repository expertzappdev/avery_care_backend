import express from 'express';
import { addFamilyMember, deleteFamilyMember, updateFamilyMember } from '../controllers/familyController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, addFamilyMember);
router.route('/:id').post(protect, updateFamilyMember);
router.route('/:familyMemberId')
    .put(protect, updateFamilyMember)
    .delete(protect, deleteFamilyMember);

export default router;