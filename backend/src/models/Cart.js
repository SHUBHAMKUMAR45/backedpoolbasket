import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  name: {
    type: String,
    required: [true, 'Product name snapshot is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price snapshot is required'],
    min: [0, 'Price cannot be negative']
  },
  image: {
    type: String
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true // one cart per user
    },
    items: [cartItemSchema],
    total: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to auto-calculate cart total
cartSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.total = this.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
  } else {
    this.total = 0;
  }
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
