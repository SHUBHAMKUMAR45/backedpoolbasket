import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    title: {
      type: String,
      trim: true,
      maxLength: [100, 'Title cannot exceed 100 characters']
    },
    comment: {
      type: String,
      trim: true,
      maxLength: [1000, 'Comment cannot exceed 1000 characters']
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// One review per user/product/order combination
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: 1 });

// Static method to update product ratings average and count
reviewSchema.statics.updateProductRating = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId, isVisible: true }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numRatings: { $sum: 1 }
      }
    }
  ]);

  const Product = mongoose.model('Product');

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': Math.round(stats[0].averageRating * 10) / 10,
      'ratings.count': stats[0].numRatings
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': 0,
      'ratings.count': 0
    });
  }
};

// Post hooks for rating recalibration
reviewSchema.post('save', async function () {
  await this.constructor.updateProductRating(this.product);
});

reviewSchema.post('remove', async function () {
  await this.constructor.updateProductRating(this.product);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await mongoose.model('Review').updateProductRating(doc.product);
  }
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
