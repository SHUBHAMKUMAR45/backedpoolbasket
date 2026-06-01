import express from 'express';
import * as deliveryController from '../controllers/delivery.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { ROLES } from '../utils/constants.js';
import { otpLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Enforce Delivery Partner role checks on all routes
router.use(authenticate, authorize(ROLES.DELIVERY_PARTNER));

router.get('/dashboard', deliveryController.getDashboard);
router.patch('/duty', deliveryController.toggleDuty);
router.get('/orders', deliveryController.getOrders);
router.get('/orders/:id', deliveryController.getOrderDetail);
router.patch('/orders/:id/status', deliveryController.updateStatus);
// B6 FIX: Apply strict rate limiting to OTP verification endpoint to prevent brute force.
// The 4-digit OTP space (1000-9999) is only 9000 values — must be rate-limited per IP.
router.post('/orders/:id/verify-otp', otpLimiter, deliveryController.verifyOtp);
router.get('/earnings', deliveryController.getEarnings);
router.post('/earnings/withdraw', deliveryController.withdraw);
router.patch('/location', deliveryController.updateLocation);
router.get('/profile', deliveryController.getProfile);
router.get('/tracking/:orderId', deliveryController.getTracking);

export default router;
