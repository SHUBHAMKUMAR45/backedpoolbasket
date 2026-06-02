import rateLimit from 'express-rate-limit';
import environment from '../config/environment.js';
import ApiError from '../utils/ApiError.js';

export const defaultLimiter = rateLimit({
  windowMs: environment.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes default
  max: environment.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many requests, please try again later.'));
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth attempts per 15 minutes
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many login attempts, please try again after 15 minutes.'));
  }
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit OTP requests to 5 per minute
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many OTP requests. Please wait a minute before requesting another.'));
  }
});
