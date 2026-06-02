import mongoose from 'mongoose';

/**
 * Transaction Model - COD Only
 * Tracks COD payment completions and refunds
 * Simplified schema for cash-on-delivery transactions
 */
const transactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
      index: true
    },
    type: {
      type: String,
      enum: ['payment', 'refund'],
      default: 'payment'
    }
  },
  {
    timestamps: true,
    indexes: [
      { createdAt: -1 },
      { order: 1, status: 1 }
    ]
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
