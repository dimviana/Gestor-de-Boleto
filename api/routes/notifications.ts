import express from 'express';
import { sendReminders, sendTestEmail } from '../controllers/notificationController';
import { protect, editor, admin } from '../middleware/auth';

const router = express.Router();

router.route('/send-reminders').post(protect, editor, sendReminders);
router.route('/test-email').post(protect, admin, sendTestEmail);

export default router;