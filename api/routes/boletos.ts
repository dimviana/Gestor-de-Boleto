
import express from 'express';
import {
  getBoletos,
  getBoletoById,
  createBoleto,
  updateBoletoStatus,
  updateBoletoComments,
  deleteBoleto,
} from '../controllers/boletoController';
import { protect } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.route('/').get(protect, getBoletos).post(protect, upload.single('file'), createBoleto);
router.route('/:id/status').put(protect, updateBoletoStatus);
router.route('/:id/comments').put(protect, updateBoletoComments);
router.route('/:id').get(protect, getBoletoById).delete(protect, deleteBoleto);

export default router;