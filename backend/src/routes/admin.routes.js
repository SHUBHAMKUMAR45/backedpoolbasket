import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Apply Admin Authorization checks to all dashboard routes
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/overview', adminController.getOverview);
router.get('/analytics', adminController.getAnalytics);
router.get('/customers', adminController.getCustomers);
router.get('/inventory', adminController.getInventory);

export default router;
