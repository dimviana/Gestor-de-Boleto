

import express from 'express';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  setMonitoredFolderPath,
  clearMonitoredFolderPath,
} from '../controllers/companyController';
import { protect, admin, editor } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, admin, getCompanies).post(protect, admin, createCompany);
router.route('/:id').put(protect, admin, updateCompany).delete(protect, admin, deleteCompany);

router.route('/:id/folder-monitoring')
    .put(protect, editor, setMonitoredFolderPath)
    .delete(protect, editor, clearMonitoredFolderPath);

export default router;