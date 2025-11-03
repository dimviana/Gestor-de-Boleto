import express from 'express';
import { getSslSettings, saveSslSettings, checkSslStatus } from '../controllers/sslController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/')
  .get(protect, admin, getSslSettings)
  .post(protect, admin, saveSslSettings);

router.route('/check')
    .post(protect, admin, checkSslStatus);

export default router;
