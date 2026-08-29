import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openapi } from './config/openapi.js';
import { authRouter } from './routes/authRoutes.js';
import { complaintRouter } from './routes/complaintRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { reportRouter } from './routes/reportRoutes.js';
import { webhookRouter } from './routes/webhookRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';
import { errorHandler, notFound } from './middleware/error.js';

fs.mkdirSync(env.uploadDir, { recursive: true });
export const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/uploads', express.static(env.uploadDir, { maxAge: '1d' }));
app.use('/api/auth/login', authLimiter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'nwsdb-water-leakage-api', timestamp: new Date().toISOString() }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api/auth', authRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/users', userRouter);
app.use('/api/reports', reportRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/webhooks', webhookRouter);
app.use(notFound);
app.use(errorHandler);

