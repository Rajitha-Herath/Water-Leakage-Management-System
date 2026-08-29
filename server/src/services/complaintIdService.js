import { nanoid } from 'nanoid';
import { Complaint } from '../models/Complaint.js';

export async function createComplaintId() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const candidate = `WL-${stamp}-${nanoid(6).toUpperCase()}`;
    if (!(await Complaint.exists({ publicId: candidate }))) return candidate;
  }
  throw new Error('Unable to generate a unique complaint ID');
}

