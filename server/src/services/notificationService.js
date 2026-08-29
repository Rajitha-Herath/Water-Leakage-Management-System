import twilio from 'twilio';
import { env } from '../config/env.js';
import { STATUS_LABELS } from '../constants/status.js';

let client;
function getClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken || !env.twilio.from) return null;
  client ||= twilio(env.twilio.accountSid, env.twilio.authToken);
  return client;
}

function whatsappAddress(phone) {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
}

export async function sendStatusNotification(complaint) {
  const twilioClient = getClient();
  if (!twilioClient) return { skipped: true };
  const body = `NWSDB complaint ${complaint.publicId}: status updated to ${STATUS_LABELS[complaint.status]}.`;
  try {
    const message = await twilioClient.messages.create({
      from: env.twilio.from,
      to: whatsappAddress(complaint.citizen.phoneNumber),
      body
    });
    return { sid: message.sid };
  } catch (error) {
    console.error('Twilio notification failed:', error.message);
    return { failed: true };
  }
}

export function validateTwilioWebhook(req) {
  if (!env.twilio.validateSignature) return true;
  if (!env.twilio.authToken || !env.twilio.webhookUrl) return false;
  const signature = req.get('x-twilio-signature') || '';
  return twilio.validateRequest(env.twilio.authToken, signature, env.twilio.webhookUrl, req.body);
}

