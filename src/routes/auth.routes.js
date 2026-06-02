import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middlewares/validate.js';
import authValidator from '../validators/auth.validator.js';
import { authenticate } from '../middlewares/authenticate.js';
import { uploadSingle } from '../middlewares/upload.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply authLimiter to all auth-sensitive operations
router.post('/register', authLimiter, validate(authValidator.signup), authController.register);
router.post('/login', authLimiter, validate(authValidator.login), authController.login);
router.post('/admin/login', authLimiter, validate(authValidator.login), authController.adminLogin);
router.post('/refresh-token', authController.refreshToken);

// Protected routes (require JWT verification)
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, validate(authValidator.updateProfile), authController.updateMe);
router.put('/me/avatar', authenticate, uploadSingle('image'), authController.updateAvatar);

// Phone OTP flows (for delivery partners)
router.post('/send-otp', otpLimiter, validate(authValidator.sendOtp), authController.sendOtp);
router.post('/verify-otp', authLimiter, validate(authValidator.verifyOtp), authController.verifyOtp);
router.post('/delivery/register', authenticate, validate(authValidator.deliveryRegister), authController.deliveryRegister);
router.post('/delivery/register-new', authController.registerDeliveryNew);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;
