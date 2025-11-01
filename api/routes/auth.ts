
// FIX: Changed express import to a namespace import to resolve type conflicts with DOM types.
import * as express from 'express';
import { registerUser, loginUser } from '../controllers/authController';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;