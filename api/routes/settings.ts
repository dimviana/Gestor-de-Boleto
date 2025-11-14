
import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { protect, companyAdmin } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, companyAdmin, getSettings).put(protect, companyAdmin, updateSettings);

export default router;
