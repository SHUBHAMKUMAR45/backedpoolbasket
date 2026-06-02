import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import environment from './config/environment.js';
import { defaultLimiter } from './middlewares/rateLimiter.js';
import errorHandler from './middlewares/errorHandler.js';
import ApiError from './utils/ApiError.js';
import authRouter from './routes/auth.routes.js';
import productRouter from './routes/product.routes.js';
import categoryRouter from './routes/category.routes.js';
import cartRouter from './routes/cart.routes.js';
import addressRouter from './routes/address.routes.js';
import orderRouter from './routes/order.routes.js';
import couponRouter from './routes/coupon.routes.js';
import reviewRouter from './routes/review.routes.js';
import notificationRouter from './routes/notification.routes.js';
import bannerRouter from './routes/banner.routes.js';
import deliveryRouter from './routes/delivery.routes.js';
import adminRouter from './routes/admin.routes.js';
import supportRouter from './routes/support.routes.js';
import mongoose from 'mongoose';
import { client as redisClient } from './config/redis.js';
import notFound from './middlewares/notFound.js';







const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS setup
app.use(
  cors({
    origin: environment.CLIENT_URL,
    credentials: true
  })
);

// 3. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 5. Prevent HTTP Parameter Pollution
app.use(hpp());

// 6. Apply rate limiting to all requests
app.use(defaultLimiter);

// 7. Routes mounting
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: environment.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient ? 'enabled' : 'disabled',
    version: '1.0.0'
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/addresses', addressRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/banners', bannerRouter);
app.use('/api/v1/coupons', couponRouter);
app.use('/api/v1/delivery', deliveryRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/support', supportRouter);

// 8. 404 Handler for undefined routes
app.use(notFound);

// 9. Global Error Handler
app.use(errorHandler);

export default app;
