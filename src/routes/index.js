import express from 'express';
import authRoutes from './authRoutes.js'; // importing the auth routes
import familyRoutes from './familyRoutes.js';
import callRoutes from '../routes/callRoutes.js'

import { protect } from '../middlewares/authMiddleware.js';


const router = express.Router();

router.use('/auth', authRoutes);

router.use('/family', protect, familyRoutes);

router.use('/calls', callRoutes);

export default router;