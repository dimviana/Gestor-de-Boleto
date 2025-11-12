import express from 'express';
import {
  getBoletos,
  getBoletoById,
  extractBoleto,
  saveBoleto,
  updateBoletoStatus,
  updateBoletoComments,
  deleteBoleto,
  uploadPaymentProof,
} from '../controllers/boletoController';
import { protect, editor } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// FIX: Ensure all route handlers are correctly typed.
router.route('/').get(protect, getBoletos);
router.route('/extract').post(protect, editor, upload.single('file'), extractBoleto);
router.route('/save').post(protect, editor, saveBoleto);

router.route('/:id/proof').post(protect, editor, upload.single('file'), uploadPaymentProof);
router.route('/:id/status').put(protect, editor, updateBoletoStatus);
router.route('/:id/comments').put(protect, editor, updateBoletoComments);
router.route('/:id').get(protect, getBoletoById).delete(protect, editor, deleteBoleto); // Added getBoletoById back

export default router;