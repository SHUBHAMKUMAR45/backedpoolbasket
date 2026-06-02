import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxLength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxLength: [1000, 'Description cannot exceed 1000 characters']
    },
    type: {
      type: String,
      enum: ['order', 'promo', 'info', 'delivery'],
      default: 'info'
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 7776000 } // TTL: Auto-delete notifications after 90 days (90 * 24 * 60 * 60 seconds)
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for notifications fetching
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
