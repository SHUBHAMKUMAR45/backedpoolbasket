import express from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:productId', cartController.updateQuantity);
router.delete('/', cartController.clearCart);
router.delete('/:productId', cartController.removeFromCart);

export default router;
