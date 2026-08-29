import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    officerId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['OIC', 'OFFICER'], required: true, index: true },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.index({ role: 1, active: 1, name: 1 });

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    officerId: this.officerId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    active: this.active
  };
};

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export const User = mongoose.model('User', userSchema);
