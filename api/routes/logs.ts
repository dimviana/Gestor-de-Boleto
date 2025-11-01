
import express from 'express';
import { getLogs } from '../controllers/logController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, admin, getLogs);

export default router;