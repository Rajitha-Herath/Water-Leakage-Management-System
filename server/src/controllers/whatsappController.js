import twilio from 'twilio';
import { Complaint } from '../models/Complaint.js';
import { Photo } from '../models/Photo.js';
import { createComplaintId } from '../services/complaintIdService.js';
import { validateTwilioWebhook } from '../services/notificationService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function classifyComplaint(text = '') {
  const lower = text.toLowerCase();
  if (/burst|broken main|gushing/.test(lower)) return { category: 'Pipe Burst', priority: 'Critical' };
  if (/meter/.test(lower)) return { category: 'Meter Leak', priority: 'Medium' };
  if (/valve/.test(lower)) return { category: 'Valve Leak', priority: 'High' };
  if (/service line|connection/.test(lower)) return { category: 'Service Line', priority: 'High' };
  return { category: 'Other', priority: /large|serious|urgent/.test(lower) ? 'High' : 'Medium' };
}

export const receiveWhatsApp = asyncHandler(async (req, res) => {
  if (!validateTwilioWebhook(req)) throw new AppError('Twilio signature validation failed', 403);

  const messageSid = req.body.MessageSid || req.body.SmsMessageSid;
  const existing = messageSid ? await Complaint.findOne({ twilioMessageSid: messageSid }) : null;
  if (existing) {
    const response = new twilio.twiml.MessagingResponse();
    response.message(`Your NWSDB complaint ${existing.publicId} has already been received.`);
    return res.type('text/xml').send(response.toString());
  }

  const text = String(req.body.Body || '').trim();
  const latitude = Number(req.body.Latitude);
  const longitude = Number(req.body.Longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const classification = classifyComplaint(text);
  const complaint = await Complaint.create({
    publicId: await createComplaintId(),
    citizen: {
      phoneNumber: String(req.body.From || '').replace(/^whatsapp:/, ''),
      name: String(req.body.ProfileName || 'WhatsApp Citizen')
    },
    description: text || 'Photo/location-only water leakage report',
    address: String(req.body.Address || req.body.Label || 'Location shared through WhatsApp'),
    area: String(req.body.Label || req.body.Address || 'Unspecified').slice(0, 100),
    source: 'whatsapp',
    ...classification,
    location: {
      type: 'Point',
      coordinates: hasCoordinates ? [longitude, latitude] : [80.7718, 7.8731]
    },
    twilioMessageSid: messageSid,
    history: [{ status: 'New', notes: 'Received through Twilio WhatsApp webhook' }]
  });

  const mediaCount = Math.min(10, Number(req.body.NumMedia || 0));
  const photoDocuments = [];
  for (let index = 0; index < mediaCount; index += 1) {
    const url = req.body[`MediaUrl${index}`];
    const mimeType = req.body[`MediaContentType${index}`] || 'application/octet-stream';
    if (url && mimeType.startsWith('image/')) {
      photoDocuments.push({ complaint: complaint._id, url, type: 'complaint', mimeType });
    }
  }
  if (photoDocuments.length) await Photo.insertMany(photoDocuments);

  req.app.get('io')?.emit('complaint:created', complaint.toObject());
  const response = new twilio.twiml.MessagingResponse();
  response.message(
    `Your water leakage complaint (${complaint.publicId}) has been received. ` +
      'An officer will be assigned shortly. Keep this ID for reference.'
  );
  return res.type('text/xml').status(201).send(response.toString());
});

