

import express from 'express';
import {
  getBoletos,
  getBoletoById,
  createBoleto,
  updateBoletoStatus,
  updateBoletoComments,
  deleteBoleto,
} from '../controllers/boletoController';
import { protect, editor } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.route('/').get(protect, getBoletos).post(protect, editor, upload.single('file'), createBoleto);
router.route('/:id/status').put(protect, editor, updateBoletoStatus);
router.route('/:id/comments').put(protect, editor, updateBoletoComments);
router.route('/:id').get(protect, getBoletoById).delete(protect, editor, deleteBoleto);

export default router;