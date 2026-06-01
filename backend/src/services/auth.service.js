import User from '../models/User.js';
import OTP from '../models/OTP.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import ApiError from '../utils/ApiError.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';
import environment from '../config/environment.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { set as redisSet } from '../config/redis.js';
import { sendEmail } from '../utils/email.js';

export const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  // Ensure Email OTP verification has been successfully completed
  const verifiedOtp = await OTP.findOne({ email, verified: true }).sort({ updatedAt: -1 });
  if (!verifiedOtp) {
    throw new ApiError(400, 'Email OTP verification is mandatory before registration.');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'user'
  });

  // Consume verified OTPs to prevent reuse
  await OTP.deleteMany({ email });

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Hash and save refresh token to database
  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  return { user, accessToken, refreshToken };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  user.lastLogin = new Date();
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  return { user, accessToken, refreshToken };
};

export const adminLogin = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  if (user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin credentials required.');
  }

  user.lastLogin = new Date();
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  return { user, accessToken, refreshToken };
};

export const refreshTokens = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Refresh token is required');
  }

  try {
    const decoded = jwt.verify(incomingRefreshToken, environment.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user || !user.refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const isMatch = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = await bcrypt.hash(refreshToken, 12);
    await user.save();

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(401, error.message || 'Invalid refresh token');
  }
};

export const logout = async (userId, accessToken) => {
  // B4 FIX: Invalidate the access token by adding it to the Redis blacklist.
  // Key = jwt_blacklist:{userId}:{iat} — unique per token issuance.
  // TTL = remaining lifetime of the JWT so the key auto-expires when the token would have
  // expired anyway, preventing the Redis blacklist from growing unbounded.
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, environment.JWT_SECRET);
      if (decoded && decoded.iat && decoded.exp) {
        const remainingTtlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTtlSeconds > 0) {
          const blacklistKey = `jwt_blacklist:${userId}:${decoded.iat}`;
          await redisSet(blacklistKey, '1', remainingTtlSeconds);
        }
      }
    } catch (err) {
      // Non-fatal: blacklist failure should not prevent logout.
      // If verification fails (e.g. token is already expired or invalid), we log it and skip blacklist write.
      logger.warn(`JWT blacklist write failed during logout for user ${userId}: ${err.message}`);
    }
  }

  // Clear refresh token from DB
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
};

export const sendOtp = async (email) => {
  // Find latest unverified OTP
  const latestOtp = await OTP.findOne({ email, verified: false }).sort({ createdAt: -1 });

  if (latestOtp && latestOtp.attempts < 5) {
    const elapsed = Date.now() - new Date(latestOtp.createdAt).getTime();
    if (elapsed < 60000) {
      throw new ApiError(429, 'Please wait 60 seconds before requesting a new OTP.');
    }
  }

  // Generate 4-digit code
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedOtp = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  await OTP.create({
    email,
    otp: hashedOtp,
    expiresAt
  });

  // Send via Nodemailer email
  try {
    await sendEmail({
      to: email,
      subject: 'Phool Basket Verification Code',
      text: `Your Phool Basket verification code is: ${otpCode}. Valid for 5 minutes.`
    });
    logger.info(`Verification email sent successfully to ${email}`);
  } catch (err) {
    logger.error(`Failed to dispatch verification email: ${err.message}`);
    // If not in production, don't fail, but let them know it fell back
    if (environment.NODE_ENV === 'production') {
      throw new ApiError(500, 'Failed to send OTP email. Please try again.');
    }
  }

  return { message: `OTP sent to ${email}`, email };
};

export const verifyOtp = async (email, otp, purpose) => {
  const latestOtp = await OTP.findOne({ email, verified: false }).sort({ createdAt: -1 });

  if (!latestOtp) {
    throw new ApiError(404, 'No active OTP request found for this email');
  }

  if (latestOtp.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // B11 FIX: Check >= 5 BEFORE incrementing so the 5th attempt is permitted to reach bcrypt.
  if (latestOtp.attempts >= 5) {
    throw new ApiError(429, 'Maximum OTP verification attempts exceeded. Please request a new one.');
  }

  latestOtp.attempts += 1;

  const isMatched = await latestOtp.verify(otp);
  if (!isMatched) {
    await latestOtp.save();
    throw new ApiError(401, 'Incorrect OTP code');
  }

  latestOtp.verified = true;
  await latestOtp.save();

  if (purpose === 'register') {
    return { verified: true, email };
  }

  // Find or create User with role delivery_partner
  let user = await User.findOne({ email });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await User.create({
      name: `Delivery Partner ${email.split('@')[0]}`,
      email,
      role: 'delivery_partner',
      isActive: true
    });
  } else {
    // B1 FIX: CRITICAL — Privilege Escalation Guard.
    if (user.role === 'user' || user.role === 'admin') {
      throw new ApiError(
        403,
        'This email address is associated with a customer/admin account. Please use email and password to log in.'
      );
    }
    // Allow through for existing delivery_partner accounts (normal re-login)
    if (user.role !== 'delivery_partner') {
      throw new ApiError(403, 'Account role is not permitted for OTP authentication.');
    }
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  user.lastLogin = new Date();
  await user.save();

  return { user, accessToken, refreshToken, isNewUser };
};

export const deliveryRegister = async ({ name, email, vehicleType, vehicleNumber }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found. Please verify OTP first.');
  }

  if (user.role !== 'delivery_partner') {
    throw new ApiError(403, 'User is not registered as a delivery partner.');
  }

  user.name = name;
  await user.save();

  // Upsert the corresponding DeliveryPartner record
  await DeliveryPartner.findOneAndUpdate(
    { user: user._id },
    {
      vehicleType,
      vehicleNumber,
      vehicleName: `${vehicleType} Vehicle`
    },
    { upsert: true, new: true }
  );

  return user;
};

export const updateProfile = async (userId, { name, phone }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;

  await user.save();
  return user;
};

export const updateAvatar = async (userId, fileBuffer, originalname) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Delete previous Cloudinary image if it exists
  if (user.avatar && user.avatar.publicId) {
    try {
      await deleteImage(user.avatar.publicId);
    } catch (err) {
      logger.error(`Error deleting user avatar: ${err.message}`);
    }
  }

  const uploadResult = await uploadImage(fileBuffer, 'avatars');
  user.avatar = {
    url: uploadResult.url,
    publicId: uploadResult.publicId
  };

  await user.save();
  return user;
};
