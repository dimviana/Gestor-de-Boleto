
import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.route('/').get(protect, admin, getUsers).post(protect, admin, createUser);
router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);

export default router;