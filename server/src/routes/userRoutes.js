import { Router } from 'express';
import { createUser, deleteUser, listUsers, updateUser } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const userRouter = Router();
userRouter.use(authenticate, authorize('OIC'));
userRouter.route('/').get(listUsers).post(createUser);
userRouter.route('/:id').patch(updateUser).delete(deleteUser);
