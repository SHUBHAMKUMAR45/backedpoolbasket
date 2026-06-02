import express from 'express';
import * as supportController from '../controllers/support.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authLimiter, supportController.createTicket);
router.get('/', supportController.getMyTickets);

export default router;
