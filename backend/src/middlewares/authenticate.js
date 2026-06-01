import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import environment from '../config/environment.js';
import { get as redisGet } from '../config/redis.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Retrieve the authorization header
  const authHeader = req.headers.authorization;

  // FIX L3: Use 'Bearer ' with a space to avoid off-by-one edge case
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Please authenticate. Access token is missing.');
  }

  try {
    // 2. Decode the token using the secret
    const decoded = jwt.verify(token, environment.JWT_SECRET);

    // 3. B4 FIX: Check JWT blacklist in Redis.
    // On logout, tokens are added to the blacklist with TTL = remaining token lifetime.
    // This closes the 7-day window where stolen post-logout tokens remain valid.
    const blacklistKey = `jwt_blacklist:${decoded.id}:${decoded.iat}`;
    const isBlacklisted = await redisGet(blacklistKey);
    if (isBlacklisted) {
      throw new ApiError(401, 'Session has been revoked. Please log in again.');
    }

    // 4. Find the user associated with this token ID
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, 'The user belonging to this token no longer exists.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account is deactivated. Please contact support.');
    }

    // 5. Attach user object and decoded token to the request
    req.user = user;
    req.tokenDecoded = decoded; // Used by logout to blacklist this specific token
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
    throw new ApiError(401, 'Invalid authentication credentials.');
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required before authorization.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Role (${req.user.role}) is not authorized to access this resource.`
        )
      );
    }

    next();
  };
};
