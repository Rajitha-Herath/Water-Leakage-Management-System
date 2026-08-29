import 'dotenv/config';
import path from 'node:path';

const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/water_leakage',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-before-deployment',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim()),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_MB || 8) * 1024 * 1024,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_WHATSAPP_NUMBER || '',
    validateSignature: process.env.TWILIO_VALIDATE_SIGNATURE === 'true',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || ''
  }
};

