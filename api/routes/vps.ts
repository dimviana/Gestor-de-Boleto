import express from 'express';
import { getVpsSettings, saveVpsSettings, triggerUpdate } from '../controllers/vpsController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/')
  .get(protect, admin, getVpsSettings)
  .post(protect, admin, saveVpsSettings);

router.route('/update')
  .post(protect, admin, triggerUpdate);

export default router;
