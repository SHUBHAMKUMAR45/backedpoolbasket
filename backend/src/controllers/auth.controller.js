import * as authService from '../services/auth.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res
    .status(201)
    .json(new ApiResponse(201, result, 'Registration successful'));
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Login successful'));
});

export const adminLogin = asyncHandler(async (req, res) => {
  const result = await authService.adminLogin(req.body);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Admin login successful'));
});

export const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshTokens(req.body.refreshToken);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Token refreshed successfully'));
});

export const logout = asyncHandler(async (req, res) => {
  // B4 FIX: Pass raw access token so logout service can blacklist it in Redis
  const accessToken = req.headers.authorization?.split(' ')[1];
  await authService.logout(req.user._id, accessToken);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, 'Profile fetched successfully'));
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res
    .status(200)
    .json(new ApiResponse(200, { user }, 'Profile updated successfully'));
});

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an image file');
  }
  const user = await authService.updateAvatar(
    req.user._id,
    req.file.buffer,
    req.file.originalname
  );
  res
    .status(200)
    .json(new ApiResponse(200, { user }, 'Avatar updated successfully'));
});

export const sendOtp = asyncHandler(async (req, res) => {
  const result = await authService.sendOtp(req.body.email);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'OTP sent successfully'));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp, req.body.purpose);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'OTP verified successfully'));
});

export const deliveryRegister = asyncHandler(async (req, res) => {
  const user = await authService.deliveryRegister(req.body);
  res
    .status(201)
    .json(new ApiResponse(201, { user }, 'Delivery partner profile completed successfully'));
});
