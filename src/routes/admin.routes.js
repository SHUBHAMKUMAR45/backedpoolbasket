import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { ROLES } from '../utils/constants.js';

import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

// All admin routes require authentication and authorization
router.use(authenticate, authorize(ROLES.ADMIN));

// Admin order management (optimized for COD-only operations)
router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id/status', orderController.updateOrderStatus);
router.post('/orders/:id/assign-delivery', orderController.assignDeliveryPartner);
router.post('/orders/assign-pending', adminController.assignRandomPendingOrder);

// Delivery Partner management
router.get('/delivery-partners', adminController.getDeliveryPartners);
router.patch('/delivery-partners/:id/status', adminController.toggleDeliveryPartnerStatus);
router.get('/reports', adminController.getDeliveryReports);

export default router;
