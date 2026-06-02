import express from 'express';
import * as bannerController from '../controllers/banner.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { uploadSingle } from '../middlewares/upload.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Publicly read banners
router.get('/', bannerController.getBanners);

// Protected routes (Admin only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  uploadSingle('image'),
  bannerController.createBanner
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  uploadSingle('image'),
  bannerController.updateBanner
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  bannerController.deleteBanner
);

export default router;
