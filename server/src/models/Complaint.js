import mongoose from 'mongoose';
import { COMPLAINT_STATUSES } from '../constants/status.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: COMPLAINT_STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, uppercase: true, index: true },
    citizen: {
      phoneNumber: { type: String, required: true, trim: true },
      name: { type: String, trim: true, default: 'WhatsApp Citizen' }
    },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    address: { type: String, trim: true, default: 'Location shared through WhatsApp' },
    area: { type: String, trim: true, default: 'Unspecified', index: true },
    category: {
      type: String,
      enum: ['Pipe Burst', 'Service Line', 'Meter Leak', 'Valve Leak', 'Other'],
      default: 'Other'
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    source: { type: String, enum: ['whatsapp', 'manual'], default: 'whatsapp', index: true },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'New', index: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        default: [80.7718, 7.8731],
        validate: {
          validator: (value) => value.length === 2,
          message: 'Coordinates must be [longitude, latitude]'
        }
      }
    },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    resolutionNotes: { type: String, trim: true, maxlength: 3000, default: '' },
    receivedAt: { type: Date, default: Date.now, index: true },
    assignedAt: Date,
    resolvedAt: Date,
    history: { type: [statusHistorySchema], default: [] },
    twilioMessageSid: { type: String, sparse: true, index: true }
  },
  { timestamps: true }
);

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ status: 1, receivedAt: -1 });
complaintSchema.index({ assignedOfficer: 1, status: 1, receivedAt: -1 });
complaintSchema.index({ description: 'text', address: 'text', area: 'text', publicId: 'text' });

export const Complaint = mongoose.model('Complaint', complaintSchema);

