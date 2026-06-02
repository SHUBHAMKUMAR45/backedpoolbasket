import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: ['Payment Issue', 'App Bug', 'Vehicle Change', 'Account Suspension', 'Other']
  },
  message: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  resolution: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model('SupportTicket', supportTicketSchema);
