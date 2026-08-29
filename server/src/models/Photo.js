import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    url: { type: String, required: true },
    storagePath: { type: String, default: '', select: false },
    type: { type: String, enum: ['complaint', 'resolution'], required: true, index: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

photoSchema.index({ complaint: 1, type: 1, uploadedAt: -1 });
export const Photo = mongoose.model('Photo', photoSchema);
