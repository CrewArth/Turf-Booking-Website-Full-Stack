import mongoose from 'mongoose';
import crypto from 'crypto';

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String, // Store email of the admin who created this admin
    required: true,
  },
});

// Hash password before saving
adminSchema.pre('save', function(next) {
  if (!this.isModified('password')) return next();
  
  const hash = crypto.createHash('sha256');
  this.password = hash.update(this.password).digest('hex');
  next();
});

// Method to compare password
adminSchema.methods.comparePassword = function(password: string) {
  const hash = crypto.createHash('sha256');
  const hashedPassword = hash.update(password).digest('hex');
  return this.password === hashedPassword;
};

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema); 