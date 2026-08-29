import { z } from 'zod';
import { User, hashPassword } from '../models/User.js';
import { Complaint } from '../models/Complaint.js';
import { audit } from '../services/auditService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createUserSchema = z.object({
  officerId: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(9).max(20),
  role: z.enum(['OIC', 'OFFICER']).default('OFFICER')
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.email().optional(),
  phone: z.string().min(9).max(20).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(128).optional()
});

export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const users = await User.find(filter).sort({ active: -1, name: 1 });
  const workloads = await Complaint.aggregate([
    { $match: { status: { $ne: 'Resolved' }, assignedOfficer: { $ne: null } } },
    { $group: { _id: '$assignedOfficer', activeComplaints: { $sum: 1 } } }
  ]);
  const workloadMap = new Map(workloads.map((item) => [item._id.toString(), item.activeComplaints]));
  res.json({
    success: true,
    users: users.map((user) => ({ ...user.toSafeObject(), activeComplaints: workloadMap.get(user.id) || 0 }))
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const user = await User.create({
    ...input,
    officerId: input.officerId.toUpperCase(),
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    password: undefined
  });
  await audit(req, 'USER_CREATED', 'User', user._id, { officerId: user.officerId, role: user.role });
  res.status(201).json({ success: true, user: user.toSafeObject() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const input = updateUserSchema.parse(req.body);
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404);
  if (user._id.equals(req.user._id) && input.active === false) {
    throw new AppError('You cannot deactivate your own account', 400);
  }
  if (input.password) {
    user.passwordHash = await hashPassword(input.password);
    delete input.password;
  }
  Object.assign(user, input);
  await user.save();
  await audit(req, 'USER_UPDATED', 'User', user._id, { fields: Object.keys(input) });
  res.json({ success: true, user: user.toSafeObject() });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User account not found', 404);

  if (user._id.equals(req.user._id)) {
    throw new AppError('You cannot delete your own account', 400);
  }

  if (user.role === 'OIC') {
    const oicCount = await User.countDocuments({ role: 'OIC' });
    if (oicCount <= 1) throw new AppError('The final OIC account cannot be deleted', 400);
  }

  const activeComplaintCount = await Complaint.countDocuments({
    assignedOfficer: user._id,
    status: { $ne: 'Resolved' }
  });
  if (activeComplaintCount > 0) {
    throw new AppError(
      `Reassign this officer's ${activeComplaintCount} active complaint${activeComplaintCount === 1 ? '' : 's'} before deleting the account`,
      409
    );
  }

  await audit(req, 'USER_DELETED', 'User', user._id, {
    officerId: user.officerId,
    role: user.role
  });
  await user.deleteOne();

  res.json({ success: true, message: 'User account deleted successfully' });
});
