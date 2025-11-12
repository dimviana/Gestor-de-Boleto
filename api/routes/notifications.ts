import express from 'express';
import { sendReminders } from '../controllers/notificationController';
import { protect, editor } from '../middleware/auth';

const router = express.Router();

router.route('/send-reminders').post(protect, editor, sendReminders);

export default router;