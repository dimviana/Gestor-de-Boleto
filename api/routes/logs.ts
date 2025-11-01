
// FIX: Changed express import to a namespace import to resolve type conflicts with DOM types.
import express from 'express';
import { getLogs } from '../controllers/logController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, admin, getLogs);

export default router;
