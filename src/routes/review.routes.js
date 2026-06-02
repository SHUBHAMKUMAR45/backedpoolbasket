import express from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();

router.post('/', authenticate, reviewController.createReview);
router.get('/product/:productId', reviewController.getProductReviews);

export default router;
