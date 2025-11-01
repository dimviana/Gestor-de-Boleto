

// FIX: Changed express import to a namespace import to resolve type conflicts with DOM types.
import * as express from 'express';
import {
  getBoletos,
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
router.route('/:id').delete(protect, deleteBoleto);

export default router;
