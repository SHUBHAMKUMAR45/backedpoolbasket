import * as bannerService from '../services/banner.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getBanners = asyncHandler(async (req, res) => {
  const activeOnly = req.query.activeOnly !== 'false';
  const banners = await bannerService.getBanners(activeOnly);
  res
    .status(200)
    .json(new ApiResponse(200, { banners }, 'Banners retrieved successfully'));
});

export const createBanner = asyncHandler(async (req, res) => {
  const fileBuffer = req.file ? req.file.buffer : null;
  const banner = await bannerService.createBanner(req.body, fileBuffer, req.user._id);
  res
    .status(201)
    .json(new ApiResponse(201, { banner }, 'Banner created successfully'));
});

export const updateBanner = asyncHandler(async (req, res) => {
  const fileBuffer = req.file ? req.file.buffer : null;
  const banner = await bannerService.updateBanner(req.params.id, req.body, fileBuffer);
  res
    .status(200)
    .json(new ApiResponse(200, { banner }, 'Banner updated successfully'));
});

export const deleteBanner = asyncHandler(async (req, res) => {
  await bannerService.deleteBanner(req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Banner deleted successfully'));
});
