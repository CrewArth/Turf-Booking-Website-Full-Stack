import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  amount: {
    type: Number,
    required: true,
  },
  bothTurfs: {
    type: Boolean,
    default: false,
  },
  paymentDetails: {
    paymentId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Add index for common queries
bookingSchema.index({ userId: 1, date: 1 });
bookingSchema.index({ slotId: 1, date: 1 });
bookingSchema.index({ status: 1 });

// Update the updatedAt field on save
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema); 