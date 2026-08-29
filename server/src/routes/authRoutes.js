import { Router } from 'express';
import { login, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();
authRouter.post('/login', login);
authRouter.get('/me', authenticate, me);

