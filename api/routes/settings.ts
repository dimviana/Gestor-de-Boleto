// FIX: Changed express import to a namespace import to resolve type conflicts with DOM types.
import * as express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, admin, getSettings).put(protect, admin, updateSettings);

export default router;