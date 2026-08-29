import { Router } from 'express';
import { receiveWhatsApp } from '../controllers/whatsappController.js';

export const webhookRouter = Router();
webhookRouter.post('/twilio/whatsapp', receiveWhatsApp);

