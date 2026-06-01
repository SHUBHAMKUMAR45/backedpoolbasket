import express from 'express';
import * as productController from '../controllers/product.controller.js';
import validate from '../middlewares/validate.js';
import productValidator from '../validators/product.validator.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { uploadMultiple } from '../middlewares/upload.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get(
  '/',
  validate({ query: productValidator.getProducts }),
  productController.getProducts
);
router.get('/:id', productController.getProduct);

// Protected routes (Admin & Seller only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SELLER),
  uploadMultiple('images', 5),
  validate(productValidator.create),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SELLER),
  uploadMultiple('images', 5),
  validate(productValidator.update),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SELLER),
  productController.deleteProduct
);

router.patch(
  '/:id/stock',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SELLER),
  productController.updateStock
);

export default router;
