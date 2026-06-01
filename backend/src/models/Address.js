import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    label: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      default: 'Home'
    },
    fullName: {
      type: String,
      required: [true, 'Recipient full name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true
    },
    street: {
      type: String,
      required: [true, 'Address line 1 (street/apartment) is required'],
      trim: true
    },
    addressLine2: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'Zip/Pincode code is required'],
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for default checks
addressSchema.index({ user: 1, isDefault: 1 });

// Pre-save hook to ensure single default address per user
addressSchema.pre('save', async function (next) {
  if (this.isModified('isDefault') && this.isDefault === true) {
    try {
      await mongoose.model('Address').updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { isDefault: false }
      );
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Address = mongoose.model('Address', addressSchema);

export default Address;
