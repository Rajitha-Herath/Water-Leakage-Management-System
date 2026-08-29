import { Router } from 'express';
import { complaintsCsv, monthlyPdf, summary } from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const reportRouter = Router();
reportRouter.use(authenticate, authorize('OIC'));
reportRouter.get('/summary', summary);
reportRouter.get('/monthly.pdf', monthlyPdf);
reportRouter.get('/complaints.csv', complaintsCsv);

