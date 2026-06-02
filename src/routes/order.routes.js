import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Admin-only static routes MUST come before parameterized routes (/:id)
// to prevent Express matching "admin" as an :id parameter value.
router.get('/admin/all', authorize(ROLES.ADMIN), orderController.getAllOrders);

// Customer routes
router.post('/', orderController.createOrder);
router.get('/', orderController.getMyOrders);
router.post('/:id/cancel', orderController.cancelOrder);
router.get('/:id', orderController.getOrderDetails);

// Admin-only parameterized routes
router.put('/:id/status', authorize(ROLES.ADMIN), orderController.updateOrderStatus);
router.post('/:id/assign-delivery', authorize(ROLES.ADMIN), orderController.assignDeliveryPartner);

export default router;
