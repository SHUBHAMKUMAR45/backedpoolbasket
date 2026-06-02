import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
      maxLength: [200, 'Title cannot exceed 200 characters']
    },
    subtitle: {
      type: String,
      trim: true,
      maxLength: [300, 'Subtitle cannot exceed 300 characters']
    },
    type: {
      type: String,
      enum: ['Promo', 'Flash', 'Festival', 'Seasonal'],
      default: 'Promo'
    },
    image: {
      url: {
        type: String,
        required: [true, 'Banner image URL is required']
      },
      publicId: {
        type: String,
        required: [true, 'Banner image public ID is required']
      }
    },
    linkType: {
      type: String,
      enum: ['category', 'product', 'external', 'none'],
      default: 'none'
    },
    linkValue: {
      type: String // Category slug, Product slug, or URL
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    startsAt: {
      type: Date
    },
    endsAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for banner ordering
bannerSchema.index({ isActive: 1, order: 1 });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
