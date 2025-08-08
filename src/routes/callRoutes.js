import express from 'express';
import { makeCall, handleVoice, handleSpeech, createScheduledCall } from '../controllers/callController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { handleCallStatus } from '../controllers/callController.js';
const router = express.Router();

router.post('/scheduleCall', protect, createScheduledCall);

router.post('/make-call', makeCall);
router.post('/voice', handleVoice);
router.post('/handle-speech', handleSpeech);
router.post('/status', handleCallStatus);
export default router;