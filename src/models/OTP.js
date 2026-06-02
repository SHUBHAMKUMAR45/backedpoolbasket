import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    otp: {
      type: String,
      required: [true, 'OTP value is required']
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expiresAfterSeconds: 0 } // TTL index: documents expire exactly at the value of expiresAt
    },
    attempts: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Method to verify candidate OTP code
otpSchema.methods.verify = async function (candidateOtp) {
  if (this.verified) return false;
  if (this.expiresAt < new Date()) return false;
  if (this.attempts > 5) return false;

  return await bcrypt.compare(candidateOtp, this.otp);
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
