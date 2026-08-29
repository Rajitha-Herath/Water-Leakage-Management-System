import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { audit } from '../services/auditService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

function signToken(user) {
  return jwt.sign({ role: user.role, officerId: user.officerId }, env.jwtSecret, {
    subject: user._id.toString(),
    expiresIn: env.jwtExpiresIn
  });
}

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !user.active || !(await user.verifyPassword(input.password))) {
    throw new AppError('Email or password is incorrect', 401);
  }
  user.lastLoginAt = new Date();
  await user.save();
  req.user = user;
  await audit(req, 'LOGIN', 'User', user._id);
  res.json({ success: true, token: signToken(user), user: user.toSafeObject() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

