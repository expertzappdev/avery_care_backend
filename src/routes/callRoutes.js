import express from 'express';
import { makeCall, handleVoice, handleSpeech, createScheduledCall, updateScheduledCall, deleteScheduledCall, getScheduledCalls, getAllScheduledCalls } from '../controllers/callController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { handleCallStatus } from '../controllers/callController.js';

const router = express.Router();

router.post('/voice', handleVoice);

router.post('/status', handleCallStatus);

router.post('/handle-speech', handleSpeech);

router.use(protect)

router.post('/scheduleCall', createScheduledCall);

router.post('/getScheduledCalls', getScheduledCalls);

router.get('/getAllScheduledCalls', getAllScheduledCalls);

router.post('/update-call/:id', updateScheduledCall);

router.delete('/delete-call/:id', deleteScheduledCall);

router.post('/make-call', makeCall);




export default router;