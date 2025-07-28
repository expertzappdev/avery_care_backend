import express from 'express';
import { addFamilyMember, deleteFamilyMember, updateFamilyMember } from '../controllers/family.controller.js';
import { protect } from '../midllewares/auth.middleware.js';

const router = express.Router();

router.route('/').post(protect, addFamilyMember);
router.route('/:id').post(protect, updateFamilyMember);
router.route('/:id')
    .put(protect, updateFamilyMember)
    .delete(protect, deleteFamilyMember);

export default router;