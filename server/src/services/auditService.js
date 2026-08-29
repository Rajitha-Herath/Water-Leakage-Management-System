import { AuditLog } from '../models/AuditLog.js';

export async function audit(req, action, entityType, entityId = null, metadata = {}) {
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      action,
      entityType,
      entityId,
      metadata,
      ip: req.ip
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
}

