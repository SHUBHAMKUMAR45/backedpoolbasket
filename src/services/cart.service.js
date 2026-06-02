import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';

export const getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    return { items: [], total: 0 };
  }

  // Filter out products that were deleted or deactivated
  const originalLength = cart.items.length;
  cart.items = cart.items.filter((item) => item.product && item.product.isActive);

  // If some deactivated/deleted items were filtered out, save to update total
  if (cart.items.length !== originalLength) {
    await cart.save();
  }

  return cart;
};

export const addToCart = async (userId, productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found or inactive');
  }

  if (product.stock < quantity) {
    throw new ApiError(400, `Insufficient stock. Only ${product.stock} units available.`);
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Item exists, update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (product.stock < newQuantity) {
      throw new ApiError(
        400,
        `Cannot add quantity. Total requested (${newQuantity}) exceeds stock (${product.stock}).`
      );
    }
    cart.items[existingItemIndex].quantity = newQuantity;
    // Update price snapshot to latest price
    cart.items[existingItemIndex].price = product.price;
  } else {
    // Push new item
    const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
    const image = primaryImage ? primaryImage.url : '';

    cart.items.push({
      product: productId,
      name: product.name,
      price: product.price, // Snapshot price at time of add
      image,
      quantity
    });
  }

  await cart.save();
  return cart.populate('items.product');
};

export const updateQuantity = async (userId, productId, quantity) => {
  if (quantity < 1) {
    throw new ApiError(400, 'Quantity must be at least 1');
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, 'Product not found in cart');
  }

  // Verify stock
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product is no longer available');
  }

  if (product.stock < quantity) {
    throw new ApiError(400, `Insufficient stock. Only ${product.stock} units available.`);
  }

  cart.items[itemIndex].quantity = quantity;
  cart.items[itemIndex].price = product.price; // Refresh price snapshot to current

  await cart.save();
  return cart.populate('items.product');
};

export const removeFromCart = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, 'Product not found in cart');
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  return cart.populate('items.product');
};

export const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return { items: [], total: 0 };
  }

  cart.items = [];
  cart.total = 0;
  await cart.save();

  return cart;
};
