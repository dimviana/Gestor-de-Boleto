import express from 'express';
import { getUpdateHistory, triggerRollback } from '../controllers/updateController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.get('/history', protect, admin, getUpdateHistory);
router.post('/rollback', protect, admin, triggerRollback);

export default router;