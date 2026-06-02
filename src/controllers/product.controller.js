import * as productService from '../services/product.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Products retrieved successfully'));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, { product }, 'Product details retrieved successfully'));
});

export const createProduct = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const imageBuffers = files.map((file) => file.buffer);

  const product = await productService.createProduct(
    req.body,
    imageBuffers,
    req.user._id
  );

  res
    .status(201)
    .json(new ApiResponse(201, { product }, 'Product created successfully'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const imageBuffers = files.map((file) => file.buffer);

  const product = await productService.updateProduct(
    req.params.id,
    req.body,
    imageBuffers
  );

  res
    .status(200)
    .json(new ApiResponse(200, { product }, 'Product updated successfully'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Product deleted successfully'));
});

export const updateStock = asyncHandler(async (req, res) => {
  const product = await productService.updateStock(req.params.id, req.body.stock);
  res
    .status(200)
    .json(new ApiResponse(200, { product }, 'Product stock updated successfully'));
});
