import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import environment from '../config/environment.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxLength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'seller', 'delivery_partner'],
      default: 'user',
      index: true
    },
    avatar: {
      url: String,
      publicId: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    refreshToken: {
      type: String,
      select: false
    },
    fcmToken: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Ensure email and phone are unique when present
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Access token generator
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role
    },
    environment.JWT_SECRET,
    {
      expiresIn: environment.JWT_EXPIRE
    }
  );
};

// Refresh token generator
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id
    },
    environment.JWT_REFRESH_SECRET,
    {
      expiresIn: environment.JWT_REFRESH_EXPIRE
    }
  );
};

// toJSON transform helper to omit sensitive properties
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

export default User;
