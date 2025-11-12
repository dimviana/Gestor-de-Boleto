import express from 'express';
import { logTracking, getTrackingLogs } from '../controllers/trackingController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/')
    .post(protect, logTracking)
    .get(protect, admin, getTrackingLogs);

export default router;
