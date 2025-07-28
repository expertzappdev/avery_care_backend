import express from 'express';
import authRoutes from './auth.routes.js'; // importing the auth routes
import familyRoutes from './family.routes.js';
const router = express.Router();


router.use('/auth', authRoutes);


router.use('/family', familyRoutes);
// router.use('/calls', callRoutes);

export default router;