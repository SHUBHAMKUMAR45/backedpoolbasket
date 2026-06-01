import express from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.getUserNotifications);
router.patch('/mark-all-read', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Admin-only broadcast endpoint
router.post('/broadcast', authorize(ROLES.ADMIN), notificationController.broadcastNotification);

export default router;
