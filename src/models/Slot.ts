import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  totalCapacity: {
    type: Number,
    default: 3,
  },
  isNight: {
    type: Boolean,
    default: false,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
});

// Create a compound index for date and time to ensure uniqueness
slotSchema.index({ date: 1, time: 1 }, { unique: true });

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