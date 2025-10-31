import express from 'express';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/companyController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, admin, getCompanies).post(protect, admin, createCompany);
router.route('/:id').put(protect, admin, updateCompany).delete(protect, admin, deleteCompany);

export default router;
