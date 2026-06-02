import * as cartService from '../services/cart.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

export const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, cart, 'Cart retrieved successfully'));
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) {
    throw new ApiError(400, 'Product ID is required');
  }

  const parsedQty = parseInt(quantity || '1', 10);
  const cart = await cartService.addToCart(req.user._id, productId, parsedQty);

  res
    .status(200)
    .json(new ApiResponse(200, cart, 'Item added to cart successfully'));
});

export const updateQuantity = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined) {
    throw new ApiError(400, 'Quantity is required');
  }

  const parsedQty = parseInt(quantity, 10);
  const cart = await cartService.updateQuantity(req.user._id, productId, parsedQty);

  res
    .status(200)
    .json(new ApiResponse(200, cart, 'Cart quantity updated successfully'));
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cart = await cartService.removeFromCart(req.user._id, productId);

  res
    .status(200)
    .json(new ApiResponse(200, cart, 'Item removed from cart successfully'));
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, cart, 'Cart cleared successfully'));
});
