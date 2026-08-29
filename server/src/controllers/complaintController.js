import fs from 'node:fs/promises';
import { z } from 'zod';
import { Complaint } from '../models/Complaint.js';
import { Photo } from '../models/Photo.js';
import { User } from '../models/User.js';
import { canTransition } from '../constants/status.js';
import { audit } from '../services/auditService.js';
import { createComplaintId } from '../services/complaintIdService.js';
import { sendStatusNotification } from '../services/notificationService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createComplaintSchema = z.object({
  phoneNumber: z.string().min(9).max(25),
  citizenName: z.string().max(100).optional(),
  description: z.string().min(3).max(3000),
  address: z.string().max(500).optional(),
  area: z.string().max(100).optional(),
  category: z.enum(['Pipe Burst', 'Service Line', 'Meter Leak', 'Valve Leak', 'Other']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional()
});

const assignSchema = z.object({ officerId: z.string().min(1) });
const statusSchema = z.object({
  status: z.enum(['Reached', 'In_Progress', 'Resolved']),
  notes: z.string().max(3000).optional().default('')
});

function complaintAccessFilter(req) {
  return req.user.role === 'OFFICER' ? { assignedOfficer: req.user._id } : {};
}

function buildListFilter(req) {
  const filter = complaintAccessFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  if (req.query.area) filter.area = new RegExp(req.query.area, 'i');
  if (req.query.officer && req.user.role === 'OIC') filter.assignedOfficer = req.query.officer;
  if (req.query.from || req.query.to) {
    filter.receivedAt = {};
    if (req.query.from) filter.receivedAt.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
    if (req.query.to) filter.receivedAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  if (req.query.q) {
    const q = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { publicId: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { address: new RegExp(q, 'i') },
      { area: new RegExp(q, 'i') },
      { 'citizen.phoneNumber': new RegExp(q, 'i') }
    ];
  }
  return filter;
}

async function attachPhotos(complaints) {
  const ids = complaints.map((complaint) => complaint._id);
  const photos = await Photo.find({ complaint: { $in: ids } }).select('-storagePath').sort({ uploadedAt: 1 }).lean();
  const byComplaint = new Map();
  for (const photo of photos) {
    const key = photo.complaint.toString();
    if (!byComplaint.has(key)) byComplaint.set(key, []);
    byComplaint.get(key).push(photo);
  }
  return complaints.map((complaint) => ({
    ...(complaint.toObject ? complaint.toObject() : complaint),
    photos: byComplaint.get(complaint._id.toString()) || []
  }));
}

export const listComplaints = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
  const filter = buildListFilter(req);
  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .populate('assignedOfficer', 'officerId name phone active')
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Complaint.countDocuments(filter)
  ]);
  res.json({
    success: true,
    complaints: await attachPhotos(items),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, ...complaintAccessFilter(req) })
    .populate('assignedOfficer', 'officerId name phone active')
    .populate('history.changedBy', 'officerId name role');
  if (!complaint) throw new AppError('Complaint not found or not accessible', 404);
  const [result] = await attachPhotos([complaint]);
  res.json({ success: true, complaint: result });
});

export const createComplaint = asyncHandler(async (req, res) => {
  const input = createComplaintSchema.parse(req.body);
  const coordinates = [input.longitude ?? 80.7718, input.latitude ?? 7.8731];
  const complaint = await Complaint.create({
    publicId: await createComplaintId(),
    citizen: { phoneNumber: input.phoneNumber, name: input.citizenName || 'Citizen' },
    description: input.description,
    address: input.address || 'Entered by OIC',
    area: input.area || 'Unspecified',
    category: input.category || 'Other',
    priority: input.priority || 'Medium',
    source: 'manual',
    location: { type: 'Point', coordinates },
    history: [{ status: 'New', changedBy: req.user._id, notes: 'Complaint entered manually' }]
  });
  await audit(req, 'COMPLAINT_CREATED', 'Complaint', complaint._id, { publicId: complaint.publicId });
  req.app.get('io')?.emit('complaint:created', complaint.toObject());
  res.status(201).json({ success: true, complaint });
});

export const assignComplaint = asyncHandler(async (req, res) => {
  const input = assignSchema.parse(req.body);
  const [complaint, officer] = await Promise.all([
    Complaint.findById(req.params.id),
    User.findOne({ _id: input.officerId, role: 'OFFICER', active: true })
  ]);
  if (!complaint) throw new AppError('Complaint not found', 404);
  if (!officer) throw new AppError('Active field officer not found', 404);
  if (complaint.status === 'Resolved') throw new AppError('Resolved complaints cannot be reassigned', 409);

  const firstAssignment = complaint.status === 'New';
  complaint.assignedOfficer = officer._id;
  complaint.assignedAt = new Date();
  if (firstAssignment) {
    complaint.status = 'Assigned';
    complaint.history.push({ status: 'Assigned', changedBy: req.user._id, notes: `Assigned to ${officer.name}` });
  } else {
    complaint.history.push({ status: complaint.status, changedBy: req.user._id, notes: `Reassigned to ${officer.name}` });
  }
  await complaint.save();
  await audit(req, 'COMPLAINT_ASSIGNED', 'Complaint', complaint._id, { officerId: officer.officerId });
  await sendStatusNotification(complaint);
  const populated = await complaint.populate('assignedOfficer', 'officerId name phone active');
  req.app.get('io')?.emit('complaint:updated', populated.toObject());
  res.json({ success: true, complaint: populated });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const input = statusSchema.parse(req.body);
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found', 404);
  if (req.user.role === 'OFFICER' && !complaint.assignedOfficer?.equals(req.user._id)) {
    throw new AppError('This complaint is assigned to another officer', 403);
  }
  if (!canTransition(complaint.status, input.status)) {
    throw new AppError(`Invalid status transition from ${complaint.status} to ${input.status}`, 409);
  }
  if (input.status === 'Resolved') {
    if (!input.notes.trim()) throw new AppError('Resolution notes are required', 400);
    const hasResolutionPhoto = await Photo.exists({ complaint: complaint._id, type: 'resolution' });
    if (!hasResolutionPhoto) throw new AppError('Upload a completion photo before resolving the complaint', 400);
    complaint.resolvedAt = new Date();
    complaint.resolutionNotes = input.notes.trim();
  }

  complaint.status = input.status;
  complaint.history.push({ status: input.status, changedBy: req.user._id, notes: input.notes.trim() });
  await complaint.save();
  await audit(req, 'COMPLAINT_STATUS_UPDATED', 'Complaint', complaint._id, { status: input.status });
  await sendStatusNotification(complaint);
  const populated = await complaint.populate('assignedOfficer', 'officerId name phone active');
  req.app.get('io')?.emit('complaint:updated', populated.toObject());
  res.json({ success: true, complaint: populated });
});

export const addPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('A photo file is required', 400);
  const type = req.body.type === 'resolution' ? 'resolution' : 'complaint';
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    await fs.unlink(req.file.path).catch(() => undefined);
    throw new AppError('Complaint not found', 404);
  }
  if (req.user.role === 'OFFICER' && !complaint.assignedOfficer?.equals(req.user._id)) {
    await fs.unlink(req.file.path).catch(() => undefined);
    throw new AppError('This complaint is assigned to another officer', 403);
  }
  const relativeUrl = `/uploads/${req.file.filename}`;
  const photo = await Photo.create({
    complaint: complaint._id,
    url: relativeUrl,
    storagePath: req.file.path,
    type,
    mimeType: req.file.mimetype,
    uploadedBy: req.user._id
  });
  await audit(req, 'PHOTO_UPLOADED', 'Complaint', complaint._id, { type, photoId: photo._id });
  const safePhoto = {
    _id: photo._id,
    complaint: photo.complaint,
    url: photo.url,
    type: photo.type,
    mimeType: photo.mimeType,
    uploadedBy: photo.uploadedBy,
    uploadedAt: photo.uploadedAt
  };
  req.app.get('io')?.emit('complaint:photo', { complaintId: complaint._id, photo: safePhoto });
  res.status(201).json({ success: true, photo: safePhoto });
});
