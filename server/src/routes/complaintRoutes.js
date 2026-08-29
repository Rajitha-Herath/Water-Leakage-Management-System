import { Router } from 'express';
import {
  addPhoto,
  assignComplaint,
  createComplaint,
  getComplaint,
  listComplaints,
  updateStatus
} from '../controllers/complaintController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';

export const complaintRouter = Router();
complaintRouter.use(authenticate);
complaintRouter.route('/').get(listComplaints).post(authorize('OIC'), createComplaint);
complaintRouter.get('/:id', getComplaint);
complaintRouter.patch('/:id/assign', authorize('OIC'), assignComplaint);
complaintRouter.patch('/:id/status', authorize('OIC', 'OFFICER'), updateStatus);
complaintRouter.post('/:id/photos', authorize('OIC', 'OFFICER'), uploadPhoto.single('photo'), addPhoto);

