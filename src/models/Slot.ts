import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  totalCapacity: {
    type: Number,
    required: true,
    default: 1,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  isNight: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Optimize indexes for common queries
slotSchema.index({ date: 1, isEnabled: 1 }); // Compound index for main query
slotSchema.index({ date: 1, time: 1 }, { unique: true }); // Ensure unique slots

// Add a pre-save middleware to ensure date is in YYYY-MM-DD format
slotSchema.pre('save', function(next) {
  if (this.date) {
    // Ensure date is in YYYY-MM-DD format
    const dateObj = new Date(this.date);
    this.date = dateObj.toISOString().split('T')[0];
  }
  next();
});

export const Slot = mongoose.models.Slot || mongoose.model('Slot', slotSchema); 