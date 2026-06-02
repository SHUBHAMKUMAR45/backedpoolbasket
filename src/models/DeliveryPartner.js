import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    vehicleType: {
      type: String,
      enum: ['Bike', 'Scooter', 'Cycle'],
      required: [true, 'Vehicle type is required']
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    vehicleName: {
      type: String,
      trim: true
    },
    vehicleColor: {
      type: String,
      trim: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isOnDuty: {
      type: Boolean,
      default: false,
      index: true
    },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date }
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    earnings: {
      today: { type: Number, default: 0 },
      week: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      balance: { type: Number, default: 0 }
    },
    bankDetails: {
      accountNumber: { type: String, select: false },
      ifsc: { type: String, select: false },
      accountName: { type: String, select: false }
    },
    kycVerified: {
      type: Boolean,
      default: false
    },
    documents: [
      {
        type: {
          type: String,
          enum: ['aadhar', 'pan', 'license', 'rc']
        },
        url: { type: String },
        publicId: { type: String },
        verified: { type: Boolean, default: false }
      }
    ]
  },
  {
    timestamps: true
  }
);

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

export default DeliveryPartner;
