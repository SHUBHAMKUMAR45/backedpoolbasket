import * as categoryService from '../services/category.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getCategories();
  res
    .status(200)
    .json(new ApiResponse(200, { categories }, 'Categories fetched successfully'));
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategory(req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, { category }, 'Category fetched successfully'));
});

export const createCategory = asyncHandler(async (req, res) => {
  const fileBuffer = req.file ? req.file.buffer : null;
  const originalname = req.file ? req.file.originalname : null;

  if (!fileBuffer) {
    throw new ApiError(400, 'Category image is required');
  }

  const category = await categoryService.createCategory({
    name: req.body.name,
    description: req.body.description,
    imageBuffer: fileBuffer,
    originalname,
    parentCategory: req.body.parentCategory
  });

  res
    .status(201)
    .json(new ApiResponse(201, { category }, 'Category created successfully'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const fileBuffer = req.file ? req.file.buffer : null;
  const category = await categoryService.updateCategory(
    req.params.id,
    req.body,
    fileBuffer
  );

  res
    .status(200)
    .json(new ApiResponse(200, { category }, 'Category updated successfully'));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Category deleted successfully'));
});
