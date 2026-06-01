import express from 'express';
import * as categoryController from '../controllers/category.controller.js';
import validate from '../middlewares/validate.js';
import categoryValidator from '../validators/category.validator.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { uploadSingle } from '../middlewares/upload.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);

// Protected routes (Admin only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  uploadSingle('image'),
  validate(categoryValidator.create),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  uploadSingle('image'),
  validate(categoryValidator.update),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  categoryController.deleteCategory
);

export default router;
