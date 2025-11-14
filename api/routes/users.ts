import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserProfile,
} from '../controllers/userController';
import { protect, companyAdmin } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, companyAdmin, getUsers).post(protect, companyAdmin, createUser);
router.route('/profile').put(protect, updateUserProfile);
router.route('/:id').put(protect, companyAdmin, updateUser).delete(protect, companyAdmin, deleteUser);

export default router;