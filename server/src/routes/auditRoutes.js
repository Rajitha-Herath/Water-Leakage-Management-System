import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const auditRouter = Router();
auditRouter.use(authenticate, authorize('OIC'));
auditRouter.get('/', listAuditLogs);

