import express from 'express';
import * as couponController from '../controllers/coupon.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Publicly validated route (any authenticated user can validate a coupon)
router.post('/validate', authenticate, couponController.validateCoupon);

// Protected administrative routes
router.get('/', authenticate, authorize(ROLES.ADMIN), couponController.getCoupons);
router.post('/', authenticate, authorize(ROLES.ADMIN), couponController.createCoupon);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), couponController.deleteCoupon);

export default router;
