import multer from 'multer';
import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  if (error instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  }
  if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'Photo exceeds the configured size limit' : error.message;
  }
  if (error.name === 'ValidationError') {
    status = 400;
    details = Object.values(error.errors).map((item) => item.message);
  }
  if (error.code === 11000) {
    status = 409;
    message = `A record already uses ${Object.keys(error.keyPattern || {}).join(', ')}`;
  }

  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}

