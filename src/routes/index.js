import express from 'express';
import authRoutes from './authRoutes.js'; // importing the auth routes
import familyRoutes from './familyRoutes.js';
const router = express.Router();


router.use('/auth', authRoutes);


router.use('/family', familyRoutes);
// router.use('/calls', callRoutes);

export default router;