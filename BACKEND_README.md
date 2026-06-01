# 🌸 Phool Basket — Complete Backend Documentation

> **Covers all 3 frontends:** Customer App (React Native / Expo) · Seller Dashboard (React Native / Expo) · Delivery Partner App (Expo Router / TypeScript)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Models](#5-database-models)
6. [API Reference — Auth](#6-api-reference--auth)
7. [API Reference — Products](#7-api-reference--products)
8. [API Reference — Categories](#8-api-reference--categories)
9. [API Reference — Cart](#9-api-reference--cart)
10. [API Reference — Orders](#10-api-reference--orders)
11. [API Reference — Payments (Razorpay)](#11-api-reference--payments-razorpay)
12. [API Reference — Addresses](#12-api-reference--addresses-missing--required)
13. [API Reference — Reviews](#13-api-reference--reviews-missing--required)
14. [API Reference — Notifications (Push)](#14-api-reference--notifications-push-missing--required)
15. [API Reference — Banners / Promotions](#15-api-reference--banners--promotions-missing--required)
16. [API Reference — Coupons](#16-api-reference--coupons-missing--required)
17. [API Reference — Seller / Admin](#17-api-reference--seller--admin-missing--required)
18. [API Reference — Delivery Partner](#18-api-reference--delivery-partner-missing--required)
19. [API Reference — Analytics](#19-api-reference--analytics-missing--required)
20. [Frontend ↔ API Mapping](#20-frontend--api-mapping)
21. [Authentication Flow](#21-authentication-flow)
22. [Error Handling & Response Format](#22-error-handling--response-format)
23. [Redis Caching Strategy](#23-redis-caching-strategy)
24. [Roles & Permissions Matrix](#24-roles--permissions-matrix)
25. [Frontend Gap Analysis](#25-frontend-gap-analysis)
26. [Setup & Running Locally](#26-setup--running-locally)
27. [Deployment Checklist](#27-deployment-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHOOL BASKET SYSTEM                       │
├──────────────────┬───────────────────────┬──────────────────────┤
│  Customer App     │   Seller Dashboard    │  Delivery Partner    │
│  React Native     │   React Native        │  Expo Router (TS)    │
│  Expo             │   Expo                │                      │
│                   │                       │                      │
│  Auth (JWT)       │  Auth (MockStorage)   │  Phone OTP Auth      │
│  Cart / Orders    │  Orders / Products    │  Order Accept/Pickup │
│  Payments RZP     │  Analytics / Coupons  │  Earnings / Map      │
│  Notifications    │  Banners / Notifs     │  KYC / Profile       │
└──────────────────┴───────────────────────┴──────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Express API     │
                    │  /api/v1/*       │
                    │  Port 5000       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐          ┌────────▼────────┐
     │    MongoDB       │          │     Redis        │
     │  Primary Store   │          │  Cache + Queues  │
     └─────────────────┘          └─────────────────┘
              │
     ┌────────▼────────┐
     │   Cloudinary     │
     │  Image Storage   │
     └─────────────────┘
              │
     ┌────────▼────────┐
     │    Razorpay      │
     │  Payment Gateway │
     └─────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v18+) |
| Framework | Express.js v4 |
| Database | MongoDB + Mongoose v7 |
| Cache | Redis (ioredis) |
| Auth | JWT (Access + Refresh tokens) |
| Payment | Razorpay SDK |
| Image Storage | Cloudinary |
| Validation | Joi / express-validator |
| Logging | Winston |
| Rate Limiting | express-rate-limit |
| OTP (Delivery) | Twilio / MSG91 (to implement) |

---

## 3. Project Structure

```
backend/
├── server.js                   # HTTP server entry point
├── .env                        # Environment config
├── package.json
└── src/
    ├── app.js                  # Express app setup, middleware, routes
    ├── config/
    │   ├── database.js         # MongoDB connection
    │   ├── redis.js            # Redis client
    │   ├── cloudinary.js       # Cloudinary config
    │   ├── razorpay.js         # Razorpay instance
    │   └── environment.js      # Env variable parser
    ├── controllers/            # Route handlers (thin layer)
    │   ├── auth.controller.js
    │   ├── cart.controller.js
    │   ├── category.controller.js
    │   ├── order.controller.js
    │   ├── payment.controller.js
    │   └── product.controller.js
    ├── services/               # Business logic
    │   ├── auth.service.js
    │   ├── cart.service.js
    │   ├── category.service.js
    │   ├── order.service.js
    │   ├── payment.service.js
    │   └── product.service.js
    ├── models/
    │   ├── User.js
    │   ├── Product.js
    │   ├── Category.js
    │   ├── Cart.js
    │   ├── Order.js
    │   ├── Address.js
    │   ├── Review.js
    │   └── Transaction.js
    ├── middlewares/
    │   ├── authenticate.js     # JWT verify + role authorize
    │   ├── errorHandler.js     # Global error handler
    │   ├── rateLimiter.js      # Per-route rate limiting
    │   └── validate.js         # Joi schema validation
    ├── routes/
    │   ├── auth.routes.js
    │   ├── product.routes.js
    │   ├── category.routes.js
    │   ├── cart.routes.js
    │   ├── order.routes.js
    │   └── payment.routes.js
    ├── validators/
    │   ├── auth.validator.js
    │   ├── product.validator.js
    │   └── category.validator.js
    └── utils/
        ├── ApiError.js
        ├── ApiResponse.js
        ├── asyncHandler.js
        ├── constants.js
        └── logger.js
```

---

## 4. Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/phool-basket
# Production:
# MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/phool-basket

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=change-me-refresh-in-production
JWT_REFRESH_EXPIRE=30d

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
USE_REDIS=false        # set true in production

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret

# OTP (Delivery Partner Auth — to be added)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Push Notifications (FCM — to be added)
FCM_SERVER_KEY=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
RATE_LIMIT_MAX=100

# CORS
CLIENT_URL=http://localhost:8081
```

---

## 5. Database Models

### 5.1 User

| Field | Type | Notes |
|---|---|---|
| `name` | String | 2–50 chars, required |
| `email` | String | unique, lowercase, required |
| `password` | String | bcrypt hashed, never returned |
| `phone` | String | Indian format `[6-9]\d{9}` |
| `role` | Enum | `user` · `admin` · `seller` · `delivery_partner` |
| `avatar.url` | String | Cloudinary URL |
| `avatar.publicId` | String | Cloudinary ID for deletion |
| `isActive` | Boolean | soft-delete flag |
| `lastLogin` | Date | |
| `refreshToken` | String | hashed, never returned |
| `fcmToken` | String | **Add this** — for push notifications |
| `timestamps` | auto | createdAt, updatedAt |

### 5.2 Product

| Field | Type | Notes |
|---|---|---|
| `name` | String | text-indexed |
| `slug` | String | unique URL slug |
| `description` | String | max 2000 chars |
| `shortDescription` | String | max 300 chars |
| `price` | Number | current price |
| `compareAtPrice` | Number | original / MRP |
| `category` | ObjectId → Category | |
| `tags` | [String] | e.g. `express`, `same-day` |
| `images[]` | Array | url, publicId, alt, isPrimary |
| `stock` | Number | |
| `sku` | String | unique, sparse |
| `isActive` | Boolean | |
| `isFeatured` | Boolean | shown on HeroSlider |
| `isExpressDelivery` | Boolean | shown with ⚡ badge |
| `ratings.average` | Number | |
| `ratings.count` | Number | |

### 5.3 Category

| Field | Type | Notes |
|---|---|---|
| `name` | String | unique |
| `slug` | String | unique |
| `image` | Object | url, publicId |
| `parentCategory` | ObjectId | for sub-categories |
| `isActive` | Boolean | |

### 5.4 Cart

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | unique per user |
| `items[].product` | ObjectId → Product | |
| `items[].name` | String | snapshotted |
| `items[].price` | Number | snapshotted |
| `items[].image` | String | |
| `items[].quantity` | Number | min 1 |
| `total` | Number | auto-computed on save |

### 5.5 Order

| Field | Type | Notes |
|---|---|---|
| `orderNumber` | String | auto `PB-YYYYMMDD-XXXXX` |
| `user` | ObjectId → User | |
| `items[]` | Array | product ref + snapshot |
| `shippingAddress` | Object | fullName, phone, addressLine1, city, state, pincode |
| `pricing.subtotal` | Number | |
| `pricing.deliveryCharge` | Number | |
| `pricing.discount` | Number | |
| `pricing.tax` | Number | |
| `pricing.total` | Number | |
| `payment.method` | Enum | `razorpay` · `cod` |
| `payment.status` | Enum | `pending` · `completed` · `failed` · `refunded` |
| `status` | Enum | `pending` · `confirmed` · `processing` · `shipped` · `delivered` · `cancelled` · `refunded` |
| `statusHistory[]` | Array | full audit trail |
| `deliveryPartnerId` | ObjectId → User | **Add this** |
| `giftMessage` | String | max 500 chars |
| `deliveryDate` | Date | scheduled |
| `couponCode` | String | **Add this** |

### 5.6 Address

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | |
| `label` | Enum | `Home` · `Work` · `Other` |
| `fullName` | String | |
| `phone` | String | |
| `street` | String | addressLine1 |
| `city` | String | |
| `state` | String | |
| `zipCode` | String | |
| `landmark` | String | |
| `isDefault` | Boolean | |

### 5.7 Review

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | |
| `product` | ObjectId → Product | |
| `order` | ObjectId → Order | ensures verified purchase |
| `rating` | Number | 1–5 |
| `title` | String | |
| `comment` | String | |
| `isVerifiedPurchase` | Boolean | |

### 5.8 Transaction (Razorpay Audit)

| Field | Type | Notes |
|---|---|---|
| `order` | ObjectId → Order | |
| `user` | ObjectId → User | |
| `razorpayOrderId` | String | |
| `razorpayPaymentId` | String | |
| `razorpaySignature` | String | |
| `amount` | Number | |
| `currency` | String | default `INR` |
| `status` | Enum | `pending` · `captured` · `failed` · `refunded` |

### 5.9 Banner *(new model required)*

| Field | Type | Notes |
|---|---|---|
| `title` | String | |
| `type` | Enum | `Promo` · `Flash` · `Festival` |
| `image.url` | String | Cloudinary |
| `image.publicId` | String | |
| `linkType` | Enum | `category` · `product` · `external` |
| `linkValue` | String | slug or URL |
| `isActive` | Boolean | |
| `order` | Number | display priority |

### 5.10 Coupon *(new model required)*

| Field | Type | Notes |
|---|---|---|
| `code` | String | unique, uppercase |
| `discountType` | Enum | `percentage` · `flat` |
| `discountValue` | Number | |
| `minOrderAmount` | Number | |
| `maxDiscount` | Number | cap for percentage |
| `expiryDate` | Date | |
| `usageLimit` | Number | max total uses |
| `usedCount` | Number | |
| `isActive` | Boolean | |

### 5.11 DeliveryPartner *(new model required)*

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | |
| `vehicleType` | Enum | `Bike` · `Scooter` · `Cycle` |
| `vehicleNumber` | String | |
| `vehicleName` | String | |
| `isOnDuty` | Boolean | |
| `currentLocation.lat` | Number | |
| `currentLocation.lng` | Number | |
| `rating` | Number | |
| `totalDeliveries` | Number | |
| `earnings.today` | Number | |
| `earnings.week` | Number | |
| `earnings.total` | Number | |
| `bankDetails.accountNumber` | String | |
| `bankDetails.ifsc` | String | |
| `kycVerified` | Boolean | |

---

## 6. API Reference — Auth

**Base:** `POST /api/v1/auth/*`

---

### POST `/api/v1/auth/register`
**Used by:** Customer App (RegisterScreen), Seller Dashboard (RegisterScreen)

**Request Body:**
```json
{
  "name": "Amit Sharma",
  "email": "amit@example.com",
  "password": "Amit@123"
}
```

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "_id": "6648...",
      "name": "Amit Sharma",
      "email": "amit@example.com",
      "role": "user",
      "createdAt": "2026-05-27T10:00:00.000Z"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Error Responses:**
- `409` — Email already registered
- `422` — Validation error (name too short, invalid email, password < 6 chars)

---

### POST `/api/v1/auth/login`
**Used by:** Customer App (LoginScreen), Seller Dashboard (LoginScreen)

**Request Body:**
```json
{
  "email": "amit@example.com",
  "password": "Amit@123"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "6648...",
      "name": "Amit Sharma",
      "email": "amit@example.com",
      "role": "user",
      "phone": "9876543210",
      "avatar": { "url": "https://res.cloudinary.com/..." }
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Error Responses:**
- `401` — Invalid credentials
- `403` — Account deactivated
- `422` — Validation error

---

### POST `/api/v1/auth/refresh-token`
**Used by:** All frontends (silent token refresh)

**Request Body:**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

### POST `/api/v1/auth/logout`
**Auth required:** Yes  
**Used by:** All frontends

**Request Body:**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Success Response `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### GET `/api/v1/auth/me`
**Auth required:** Yes  
**Used by:** All frontends — fetch current user profile

**Headers:** `Authorization: Bearer <token>`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", "role": "user", "phone": "...", "avatar": {...} }
  }
}
```

---

### PUT `/api/v1/auth/me`
**Auth required:** Yes  
**Used by:** Customer App (EditProfileScreen)

**Request Body (all optional):**
```json
{
  "name": "Amit Kumar Sharma",
  "phone": "9876543210",
  "avatar": "<base64 or multipart upload>"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": { "user": { ... } }
}
```

---

### POST `/api/v1/auth/send-otp`
**Used by:** Delivery Partner App (LoginScreen — phone-based auth)

**Request Body:**
```json
{ "phone": "9876543210" }
```

**Success Response `200`:**
```json
{ "success": true, "message": "OTP sent to +91 9876543210" }
```

---

### POST `/api/v1/auth/verify-otp`
**Used by:** Delivery Partner App (OTPScreen)

**Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "1234"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Amit Kumar", "role": "delivery_partner" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### POST `/api/v1/auth/delivery/register`
**Used by:** Delivery Partner App (RegisterScreen)

**Request Body:**
```json
{
  "name": "Amit Kumar",
  "phone": "9876543210",
  "vehicleType": "Bike",
  "vehicleNumber": "DL04SC1234"
}
```

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Partner registered. Pending KYC verification.",
  "data": { "partnerId": "PB-98210", "accessToken": "..." }
}
```

---

## 7. API Reference — Products

**Base:** `/api/v1/products`

---

### GET `/api/v1/products`
**Auth required:** No  
**Used by:** Customer App (HomeScreen, ProductListScreen, SearchScreen), Seller Dashboard (ProductManagement)

**Query Params:**
| Param | Type | Example | Description |
|---|---|---|---|
| `page` | Number | `1` | Pagination |
| `limit` | Number | `12` | Items per page (max 50) |
| `category` | String | `roses` | Category slug or ID |
| `search` | String | `rose` | Text search |
| `sort` | String | `price_asc` / `price_desc` / `rating` / `newest` | Sort order |
| `minPrice` | Number | `100` | |
| `maxPrice` | Number | `5000` | |
| `isExpress` | Boolean | `true` | Same-day delivery filter |
| `isFeatured` | Boolean | `true` | For HeroSlider |

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "...",
        "name": "Royal Red Roses",
        "slug": "royal-red-roses",
        "price": 499,
        "compareAtPrice": 699,
        "discount": 29,
        "images": [{ "url": "https://...", "isPrimary": true }],
        "ratings": { "average": 4.5, "count": 128 },
        "isExpressDelivery": true,
        "stock": 25,
        "category": { "_id": "...", "name": "Roses", "slug": "roses" }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 48,
      "pages": 4
    }
  }
}
```

---

### GET `/api/v1/products/:id`
**Auth required:** No  
**Used by:** Customer App (ProductDetailsScreen)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "...",
      "name": "Royal Red Roses",
      "description": "Premium fresh red roses...",
      "shortDescription": "...",
      "price": 499,
      "compareAtPrice": 699,
      "images": [...],
      "stock": 25,
      "ratings": { "average": 4.5, "count": 128 },
      "isExpressDelivery": true,
      "category": { "name": "Roses" },
      "tags": ["express", "bestseller"],
      "reviews": [ { ... } ]
    }
  }
}
```

---

### POST `/api/v1/products`
**Auth required:** Yes (Admin only)  
**Used by:** Customer App (AddProductScreen — seller flow), Seller Dashboard (ProductManagement)

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | Yes | |
| `description` | String | Yes | |
| `shortDescription` | String | No | |
| `price` | Number | Yes | |
| `compareAtPrice` | Number | No | |
| `category` | String | Yes | ObjectId or slug |
| `stock` | Number | Yes | |
| `isExpressDelivery` | Boolean | No | |
| `isFeatured` | Boolean | No | |
| `tags` | String (JSON array) | No | `["roses","express"]` |
| `images` | File[] | Yes | max 5, uploaded to Cloudinary |

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Product created",
  "data": { "product": { "_id": "...", "slug": "royal-red-roses", ... } }
}
```

---

### PUT `/api/v1/products/:id`
**Auth required:** Yes (Admin only)  
**Used by:** Seller Dashboard (ProductManagement — edit modal)

Same body as POST, all fields optional.

---

### DELETE `/api/v1/products/:id`
**Auth required:** Yes (Admin only)  
**Used by:** Seller Dashboard (ProductManagement)

**Success Response `200`:**
```json
{ "success": true, "message": "Product deleted" }
```

---

### PATCH `/api/v1/products/:id/stock`
**Auth required:** Yes (Admin only)  
**Used by:** Seller Dashboard (InventoryScreen)

**Request Body:**
```json
{ "stock": 50 }
```

---

## 8. API Reference — Categories

**Base:** `/api/v1/categories`

---

### GET `/api/v1/categories`
**Auth required:** No  
**Used by:** Customer App (CategoryBar — Flowers, Cakes, Gifts, Plants, etc.)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "categories": [
      { "_id": "...", "name": "Roses", "slug": "roses", "image": { "url": "..." } },
      { "_id": "...", "name": "Cakes", "slug": "cakes", "image": { "url": "..." } },
      { "_id": "...", "name": "Birthday", "slug": "birthday", "image": { "url": "..." } },
      { "_id": "...", "name": "Wedding", "slug": "wedding", "image": { "url": "..." } },
      { "_id": "...", "name": "Plants", "slug": "plants", "image": { "url": "..." } }
    ]
  }
}
```

---

### GET `/api/v1/categories/:id`
**Auth required:** No

---

### POST `/api/v1/categories`
**Auth required:** Yes (Admin)  
**Content-Type:** `multipart/form-data`

**Form Fields:** `name`, `image` (file)

---

### PUT `/api/v1/categories/:id`
**Auth required:** Yes (Admin)

---

### DELETE `/api/v1/categories/:id`
**Auth required:** Yes (Admin)

---

## 9. API Reference — Cart

**Base:** `/api/v1/cart`  
**Auth required:** Yes (all cart routes)

---

### GET `/api/v1/cart`
**Used by:** Customer App (CartScreen, CheckoutScreen)

**Headers:** `Authorization: Bearer <token>`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "...",
      "items": [
        {
          "product": "...",
          "name": "Royal Red Roses",
          "price": 499,
          "image": "https://...",
          "quantity": 2
        }
      ],
      "total": 998
    }
  }
}
```

---

### POST `/api/v1/cart`
**Used by:** Customer App (ProductDetailsScreen — Add to Cart button)

**Request Body:**
```json
{
  "productId": "6648...",
  "quantity": 1
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": { "cart": { ... } }
}
```

**Error:** `400` if product out of stock, `404` if product not found

---

### PUT `/api/v1/cart/:productId`
**Used by:** Customer App (CartScreen — +/– quantity buttons)

**Request Body:**
```json
{ "quantity": 3 }
```

**Success Response `200`:** returns updated cart

---

### DELETE `/api/v1/cart/:productId`
**Used by:** Customer App (CartScreen — trash icon)

**Success Response `200`:** returns updated cart

---

### DELETE `/api/v1/cart`
**Used by:** Customer App (after order placement)

**Success Response `200`:**
```json
{ "success": true, "message": "Cart cleared" }
```

---

## 10. API Reference — Orders

**Base:** `/api/v1/orders`  
**Auth required:** Yes (all order routes)

---

### POST `/api/v1/orders`
**Used by:** Customer App (CheckoutScreen — Place Order)

**Request Body:**
```json
{
  "items": [
    { "product": "6648...", "quantity": 1 }
  ],
  "shippingAddress": {
    "fullName": "Amit Sharma",
    "phone": "9876543210",
    "addressLine1": "H-45 Green Park",
    "city": "New Delhi",
    "state": "Delhi",
    "pincode": "110016"
  },
  "payment": {
    "method": "razorpay"
  },
  "giftMessage": "Happy Birthday!",
  "couponCode": "PHOOL20"
}
```

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "PB-20260527-AB3X1",
      "status": "pending",
      "pricing": {
        "subtotal": 499,
        "deliveryCharge": 50,
        "discount": 99,
        "total": 450
      },
      "payment": {
        "method": "razorpay",
        "status": "pending",
        "razorpayOrderId": "order_..."
      }
    }
  }
}
```

---

### GET `/api/v1/orders`
**Used by:** Customer App (OrdersScreen)

**Query Params:** `page`, `limit`, `status`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "...",
        "orderNumber": "PB-10293",
        "status": "delivered",
        "pricing": { "total": 1299 },
        "items": [ { "name": "Mixed Roses & Lilies Bouquet", "quantity": 1, "image": "..." } ],
        "createdAt": "2026-05-24T10:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### GET `/api/v1/orders/:id`
**Used by:** Customer App (OrderDetailsScreen)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "PB-10293",
      "status": "delivered",
      "items": [...],
      "shippingAddress": { ... },
      "pricing": { "subtotal": 1249, "deliveryCharge": 50, "discount": 0, "total": 1299 },
      "payment": { "method": "razorpay", "status": "completed", "paidAt": "..." },
      "statusHistory": [
        { "status": "pending", "timestamp": "..." },
        { "status": "confirmed", "timestamp": "..." },
        { "status": "shipped", "timestamp": "..." },
        { "status": "delivered", "timestamp": "..." }
      ]
    }
  }
}
```

---

### PUT `/api/v1/orders/:id/status`
**Auth required:** Yes (Admin only)  
**Used by:** Seller Dashboard (OrderManagement — status update modal)

**Request Body:**
```json
{
  "status": "shipped",
  "note": "Dispatched via Blue Dart"
}
```

**Valid statuses:** `confirmed` → `processing` → `shipped` → `delivered` · or `cancelled`

**Success Response `200`:** returns updated order

---

### GET `/api/v1/orders/admin/all`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (OrderManagement)

**Query Params:** `page`, `limit`, `status`, `search` (by orderId or customer name), `dateFrom`, `dateTo`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "orders": [ { ... } ],
    "pagination": { ... },
    "summary": {
      "total": 120,
      "pending": 12,
      "shipped": 35,
      "delivered": 68,
      "cancelled": 5
    }
  }
}
```

---

### POST `/api/v1/orders/:id/assign-delivery`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (OrderManagement — assign delivery partner)

**Request Body:**
```json
{ "deliveryPartnerId": "6648..." }
```

---

## 11. API Reference — Payments (Razorpay)

**Base:** `/api/v1/payments`  
**Auth required:** Yes

---

### POST `/api/v1/payments/create-order`
**Used by:** Customer App (CheckoutScreen — before opening Razorpay SDK)

**Request Body:**
```json
{
  "amount": 499,
  "currency": "INR",
  "orderId": "6648..."
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_abc123",
    "amount": 49900,
    "currency": "INR",
    "keyId": "rzp_test_..."
  }
}
```

---

### POST `/api/v1/payments/verify`
**Used by:** Customer App — called after Razorpay payment callback

**Request Body:**
```json
{
  "razorpayOrderId": "order_abc123",
  "razorpayPaymentId": "pay_xyz789",
  "razorpaySignature": "sha256_hash",
  "orderId": "6648..."
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Payment verified. Order confirmed.",
  "data": {
    "order": {
      "orderNumber": "PB-20260527-AB3X1",
      "status": "confirmed",
      "payment": { "status": "completed", "paidAt": "..." }
    }
  }
}
```

**Error Response `400`:**
```json
{ "success": false, "message": "Payment verification failed. Invalid signature." }
```

---

## 12. API Reference — Addresses *(Missing — Required)*

**Base:** `/api/v1/addresses`  
**Auth required:** Yes  
**Used by:** Customer App (AddressesScreen, AddAddressScreen, CheckoutScreen)

> ⚠️ **This module does not exist yet** but is consumed by the Customer App frontend. Must be built.

---

### GET `/api/v1/addresses`
Returns all saved addresses for the logged-in user.

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "_id": "...",
        "label": "Home",
        "fullName": "Amit Sharma",
        "phone": "+91 9876543210",
        "street": "H-45 Green Park",
        "city": "New Delhi",
        "state": "Delhi",
        "zipCode": "110016",
        "isDefault": true
      }
    ]
  }
}
```

---

### POST `/api/v1/addresses`
**Request Body:**
```json
{
  "label": "Home",
  "fullName": "Amit Sharma",
  "phone": "9876543210",
  "street": "H-45 Green Park",
  "city": "New Delhi",
  "state": "Delhi",
  "zipCode": "110016",
  "landmark": "Near Metro Station"
}
```

---

### PUT `/api/v1/addresses/:id`
Update an address.

---

### DELETE `/api/v1/addresses/:id`
Delete an address.

---

### PATCH `/api/v1/addresses/:id/set-default`
Set an address as default.

**Success Response `200`:**
```json
{ "success": true, "message": "Default address updated" }
```

---

## 13. API Reference — Reviews *(Missing — Required)*

**Base:** `/api/v1/reviews`

> ⚠️ **This module does not exist yet** but OrderDetailsScreen has a "Review" button on each item.

---

### POST `/api/v1/reviews`
**Auth required:** Yes  
**Used by:** Customer App (OrderDetailsScreen — Review button)

**Request Body:**
```json
{
  "productId": "6648...",
  "orderId": "6648...",
  "rating": 5,
  "title": "Beautiful flowers!",
  "comment": "Fresh roses, perfect arrangement."
}
```

---

### GET `/api/v1/reviews/product/:productId`
**Auth required:** No

Returns paginated reviews for a product with ratings breakdown.

---

## 14. API Reference — Notifications (Push) *(Missing — Required)*

**Base:** `/api/v1/notifications`

> ⚠️ **Required** by both Customer App (NotificationsScreen) and Seller Dashboard (NotificationPanel / BroadcastCenter).

---

### GET `/api/v1/notifications`
**Auth required:** Yes  
**Used by:** Customer App (NotificationsScreen)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "title": "Order Delivered Successfully!",
        "description": "Your order #PB-10293 has been delivered.",
        "type": "order",
        "read": false,
        "createdAt": "2026-05-27T10:00:00.000Z"
      }
    ],
    "unreadCount": 1
  }
}
```

---

### PATCH `/api/v1/notifications/:id/read`
Mark a notification as read.

---

### PATCH `/api/v1/notifications/mark-all-read`
Mark all notifications as read.

---

### DELETE `/api/v1/notifications/:id`
Delete a notification.

---

### POST `/api/v1/notifications/broadcast`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (NotificationPanel — Broadcast Center)

**Request Body:**
```json
{
  "title": "Festival Offer!",
  "message": "Get 20% off all flowers this Diwali! Use DIWALI20",
  "category": "Promotion",
  "targetAudience": "all"
}
```

**`targetAudience` values:** `all` · `customers` · `delivery_partners`

---

### PUT `/api/v1/users/fcm-token`
**Auth required:** Yes  
**Used by:** All frontends on app start (register FCM device token)

**Request Body:**
```json
{ "fcmToken": "fE73dK..." }
```

---

## 15. API Reference — Banners / Promotions *(Missing — Required)*

**Base:** `/api/v1/banners`

> ⚠️ **Required** by Customer App (HeroSlider) and Seller Dashboard (BannerManagement).

---

### GET `/api/v1/banners`
**Auth required:** No  
**Used by:** Customer App (HeroSlider component)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "banners": [
      {
        "_id": "...",
        "title": "Mother's Day Special",
        "type": "Promo",
        "image": { "url": "https://..." },
        "linkType": "category",
        "linkValue": "flowers",
        "order": 1
      }
    ]
  }
}
```

---

### POST `/api/v1/banners`
**Auth required:** Yes (Admin)  
**Content-Type:** `multipart/form-data`  
**Used by:** Seller Dashboard (BannerManagement — + Create)

**Form Fields:** `title`, `type` (Promo/Flash), `image` (file), `linkType`, `linkValue`, `order`

---

### PUT `/api/v1/banners/:id`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (BannerManagement — Edit)

---

### DELETE `/api/v1/banners/:id`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (BannerManagement — Delete)

---

## 16. API Reference — Coupons *(Missing — Required)*

**Base:** `/api/v1/coupons`

> ⚠️ **Required** by Customer App (CheckoutScreen coupon field) and Seller Dashboard (CouponManagement).

---

### POST `/api/v1/coupons/validate`
**Auth required:** Yes  
**Used by:** Customer App (CheckoutScreen — apply coupon)

**Request Body:**
```json
{
  "code": "PHOOL20",
  "orderAmount": 999
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "coupon": {
      "code": "PHOOL20",
      "discountType": "percentage",
      "discountValue": 20,
      "discountAmount": 199,
      "finalAmount": 800
    }
  }
}
```

**Error `400`:** Coupon expired / minimum order not met / usage limit reached

---

### GET `/api/v1/coupons`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (CouponManagement)

---

### POST `/api/v1/coupons`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (CouponManagement — + Create)

**Request Body:**
```json
{
  "code": "PHOOL20",
  "discountType": "percentage",
  "discountValue": 20,
  "minOrderAmount": 499,
  "maxDiscount": 200,
  "expiryDate": "2026-06-30T23:59:59.000Z",
  "usageLimit": 100
}
```

---

### DELETE `/api/v1/coupons/:id`
**Auth required:** Yes (Admin)

---

## 17. API Reference — Seller / Admin *(Missing — Required)*

> ⚠️ Seller Dashboard has `AuthService` using **local mock storage** — it must be replaced with real API calls.

---

### GET `/api/v1/admin/overview`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (AdminOverview screen)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalOrders": 120,
      "revenueToday": 25000,
      "newCustomers": 8,
      "activeProducts": 45
    },
    "revenueChart": {
      "labels": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      "data": [4200, 3800, 5100, 6200, 7800, 9200, 8400]
    },
    "categoryBreakdown": [
      { "name": "Roses", "percentage": 40, "value": 10000 },
      { "name": "Wedding", "percentage": 30 },
      { "name": "Birthday", "percentage": 20 },
      { "name": "Others", "percentage": 10 }
    ],
    "recentActivity": [
      { "type": "order", "text": "Order #1024 delivered", "time": "2 mins ago" }
    ]
  }
}
```

---

### GET `/api/v1/admin/analytics`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (AnalyticsPage)

**Query Params:** `period` (`weekly` / `monthly` / `yearly`)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "monthlyRevenue": [30000, 45000, 60000, 40000, 80000, 95000, 70000, 85000, 100000, 75000, 90000, 110000],
    "categorySales": [ ... ],
    "metrics": {
      "monthlyProfit": 45200,
      "avgOrderValue": 875,
      "repeatCustomers": "34%",
      "conversionRate": "12%"
    },
    "topProducts": [ { "name": "Royal Red Roses", "sales": 182, "revenue": 90818 } ]
  }
}
```

---

### GET `/api/v1/admin/customers`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (CustomerManagement)

**Query Params:** `page`, `limit`, `search`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "_id": "...",
        "name": "Anshul Verma",
        "email": "anshul@example.com",
        "phone": "+91 9876543210",
        "totalOrders": 5,
        "totalSpent": 4500,
        "joinedAt": "2026-01-01"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### GET `/api/v1/admin/inventory`
**Auth required:** Yes (Admin)  
**Used by:** Seller Dashboard (InventoryScreen)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "productId": "...",
        "name": "Red Roses",
        "stock": 15,
        "unit": "stems",
        "status": "In Stock",
        "lastUpdated": "2026-05-27"
      }
    ],
    "alerts": {
      "outOfStock": ["White Orchids"],
      "lowStock": ["Yellow Lilies", "Marigold"]
    }
  }
}
```

---

## 18. API Reference — Delivery Partner *(Missing — Required)*

> ⚠️ Delivery app has no API integration yet — all data is static mock. Full set of APIs required.

---

### GET `/api/v1/delivery/dashboard`
**Auth required:** Yes (delivery_partner role)  
**Used by:** Delivery App (Home/Dashboard tab)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "partner": {
      "name": "Amit Kumar",
      "partnerId": "PB-98210",
      "rating": 4.8,
      "isOnDuty": false
    },
    "todayStats": {
      "earnings": 1240.50,
      "orders": 12,
      "incentive": 150,
      "distance": 42,
      "loginHours": 6.5
    },
    "activeOrders": [ { ... } ],
    "availableOrders": [ { ... } ]
  }
}
```

---

### PATCH `/api/v1/delivery/duty`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (DutyToggle component)

**Request Body:**
```json
{ "isOnDuty": true }
```

---

### GET `/api/v1/delivery/orders`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (Orders tab)

**Query Params:** `status` (`pending` / `active` / `delivered`)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "8291",
        "orderNumber": "PB-20260527-8291",
        "customerName": "Anjali Sharma",
        "address": "H-45, Green Park, South Delhi",
        "items": 3,
        "amount": "450",
        "status": "PENDING",
        "distance": "1.2 km",
        "estimatedPayout": 45,
        "storeLocation": { "lat": 28.6139, "lng": 77.2090 },
        "deliveryLocation": { "lat": 28.5355, "lng": 77.1961 }
      }
    ]
  }
}
```

---

### GET `/api/v1/delivery/orders/:id`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (order/[id].tsx)

Returns full order detail including store address, customer contact, delivery OTP.

---

### PATCH `/api/v1/delivery/orders/:id/status`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (order/[id].tsx — status action buttons)

**Request Body:**
```json
{
  "status": "ACCEPTED",
  "location": { "lat": 28.6139, "lng": 77.2090 }
}
```

**Valid `status` flow:** `PENDING` → `ACCEPTED` → `REACHED_STORE` → `PICKED_UP` → `DELIVERED`

---

### POST `/api/v1/delivery/orders/:id/verify-otp`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (OTP verification modal on delivery)

**Request Body:**
```json
{ "otp": "4521" }
```

**Success Response `200`:**
```json
{ "success": true, "message": "Delivery confirmed. Order marked as delivered." }
```

---

### GET `/api/v1/delivery/earnings`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (Earnings tab)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "balance": 4520.00,
    "nextPayout": "2026-05-22",
    "weeklyStats": [
      { "day": "Mon", "amount": 850 },
      { "day": "Tue", "amount": 620 },
      { "day": "Wed", "amount": 940 }
    ],
    "transactions": [
      { "id": "1", "date": "20 May", "orderId": "#8291", "amount": 45.00, "status": "SUCCESS" }
    ]
  }
}
```

---

### POST `/api/v1/delivery/earnings/withdraw`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (Earnings tab — WITHDRAW FUNDS button)

**Request Body:**
```json
{ "amount": 4520.00 }
```

---

### PATCH `/api/v1/delivery/location`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (background location updates while on duty)

**Request Body:**
```json
{
  "lat": 28.5700,
  "lng": 77.2000
}
```

---

### GET `/api/v1/delivery/profile`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (Profile tab)

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "partner": {
      "name": "Amit Kumar",
      "partnerId": "PB-98210",
      "rating": 4.8,
      "vehicle": {
        "type": "Bike",
        "name": "Honda Activa 6G",
        "number": "DL 04 SC 1234",
        "color": "White",
        "verified": true
      },
      "kycVerified": true,
      "totalDeliveries": 248
    }
  }
}
```

---

### GET `/api/v1/delivery/tracking/:orderId`
**Auth required:** Yes (delivery_partner)  
**Used by:** Delivery App (tracking/[id].tsx — map screen)

Returns store coords, customer coords, and current rider coords for map display.

---

## 19. API Reference — Analytics *(Missing — Required)*

> Part of the Admin/Seller section — detailed above in Section 17.

**Summary of admin analytics endpoints:**

| Endpoint | Used By |
|---|---|
| `GET /api/v1/admin/overview` | AdminOverview screen — revenue chart, stats |
| `GET /api/v1/admin/analytics` | AnalyticsPage — monthly revenue, category breakdown |
| `GET /api/v1/admin/customers` | CustomerManagement — user list |
| `GET /api/v1/admin/inventory` | InventoryScreen — stock status |

---

## 20. Frontend ↔ API Mapping

### Customer App (React Native / Expo)

| Screen | Method | Endpoint | Status |
|---|---|---|---|
| LoginScreen | POST | `/auth/login` | ✅ Implemented |
| RegisterScreen | POST | `/auth/register` | ✅ Implemented |
| HomeScreen | GET | `/products?isFeatured=true` | ⚠️ Partial (uses mock data) |
| HomeScreen | GET | `/products?isExpress=true` | ⚠️ Partial |
| HomeScreen | GET | `/banners` | ❌ Missing |
| CategoryBar | GET | `/categories` | ❌ Missing (uses hardcoded) |
| ProductListScreen | GET | `/products?category=<slug>` | ⚠️ Partial (uses mock data) |
| SearchScreen | GET | `/products?search=<q>` | ❌ Missing (local filter only) |
| ProductDetailsScreen | GET | `/products/:id` | ❌ Missing (uses nav params) |
| ProductDetailsScreen | POST | `/cart` | ❌ Missing (uses Context) |
| CartScreen | GET | `/cart` | ❌ Missing (uses Context) |
| CartScreen | PUT | `/cart/:productId` | ❌ Missing (uses Context) |
| CartScreen | DELETE | `/cart/:productId` | ❌ Missing (uses Context) |
| CheckoutScreen | POST | `/orders` | ❌ Missing (uses Alert mock) |
| CheckoutScreen | POST | `/coupons/validate` | ❌ Missing |
| CheckoutScreen | POST | `/payments/create-order` | ❌ Missing |
| PaymentMethodsScreen | — | No API (local Context) | ❌ Missing |
| AddressesScreen | GET | `/addresses` | ❌ Missing (uses Context) |
| AddAddressScreen | POST | `/addresses` | ❌ Missing (uses Context) |
| OrdersScreen | GET | `/orders` | ❌ Missing (uses MOCK_ORDERS) |
| OrderDetailsScreen | GET | `/orders/:id` | ❌ Missing (uses nav params) |
| OrderDetailsScreen | POST | `/reviews` | ❌ Missing |
| NotificationsScreen | GET | `/notifications` | ❌ Missing (uses MOCK) |
| EditProfileScreen | PUT | `/auth/me` | ❌ Missing |
| ProfileScreen | GET | `/auth/me` | ❌ Missing |

---

### Seller Dashboard (React Native / Expo)

| Screen | Method | Endpoint | Status |
|---|---|---|---|
| LoginScreen | POST | `/auth/login` (role=admin) | ❌ Uses MockStorage |
| RegisterScreen | POST | `/auth/register` | ❌ Uses MockStorage |
| AdminOverview | GET | `/admin/overview` | ❌ Static mock data |
| AnalyticsPage | GET | `/admin/analytics` | ❌ Static mock data |
| OrderManagement | GET | `/admin/orders/all` | ❌ Uses INITIAL_ORDERS array |
| OrderManagement | PUT | `/orders/:id/status` | ❌ Local state only |
| ProductManagement | GET | `/products` | ❌ Uses INITIAL_PRODUCTS array |
| ProductManagement | POST | `/products` | ❌ Local state only |
| ProductManagement | DELETE | `/products/:id` | ❌ Local state only |
| InventoryScreen | GET | `/admin/inventory` | ❌ Uses STOCK_DATA array |
| InventoryScreen | PATCH | `/products/:id/stock` | ❌ Local state only |
| CustomerManagement | GET | `/admin/customers` | ❌ Uses CUSTOMERS array |
| BannerManagement | GET | `/banners` | ❌ Uses INITIAL_BANNERS array |
| BannerManagement | POST | `/banners` | ❌ Local state only |
| BannerManagement | DELETE | `/banners/:id` | ❌ Local state only |
| CouponManagement | GET | `/coupons` | ❌ Uses INITIAL_COUPONS array |
| CouponManagement | POST | `/coupons` | ❌ Local state only |
| NotificationPanel | POST | `/notifications/broadcast` | ❌ Alert mock only |

---

### Delivery Partner App (Expo Router / TypeScript)

| Screen | Method | Endpoint | Status |
|---|---|---|---|
| LoginScreen (OTP) | POST | `/auth/send-otp` | ❌ Navigation only |
| OTPScreen | POST | `/auth/verify-otp` | ❌ Navigation only |
| RegisterScreen | POST | `/auth/delivery/register` | ❌ Navigation only |
| Dashboard (index) | GET | `/delivery/dashboard` | ❌ All mock data |
| Dashboard (DutyToggle) | PATCH | `/delivery/duty` | ❌ Local state only |
| Orders (available) | GET | `/delivery/orders?status=pending` | ❌ Mock data |
| Orders (active) | GET | `/delivery/orders?status=active` | ❌ Mock data |
| Orders (history) | GET | `/delivery/orders?status=delivered` | ❌ Mock data |
| Order Detail [id] | GET | `/delivery/orders/:id` | ❌ Mock data |
| Order Detail — Accept | PATCH | `/delivery/orders/:id/status` | ❌ Local state |
| Order Detail — Verify OTP | POST | `/delivery/orders/:id/verify-otp` | ❌ Local state |
| Tracking [id] | GET | `/delivery/tracking/:orderId` | ❌ Hardcoded coords |
| Earnings | GET | `/delivery/earnings` | ❌ Mock data |
| Earnings — Withdraw | POST | `/delivery/earnings/withdraw` | ❌ Pressable only |
| Profile | GET | `/delivery/profile` | ❌ Hardcoded |

---

## 21. Authentication Flow

### Customer App

```
1. Register/Login → POST /auth/register or /auth/login
2. Store accessToken in AsyncStorage (key: "token")
3. Every request → axios interceptor reads token → sets Authorization: Bearer <token>
4. On 401 → call POST /auth/refresh-token with stored refreshToken
5. On logout → DELETE token from AsyncStorage
```

### Seller Dashboard

```
⚠️  CURRENT STATE: MockStorage (local device storage)
     AuthService.login() checks hardcoded users list in AsyncStorage
     AuthService.register() saves to users[] in AsyncStorage

REQUIRED CHANGE:
1. Replace AuthService with real API calls to /auth/login and /auth/register
2. Validate that returned user.role === 'admin' or 'seller'
3. Store JWT same as Customer App
4. Protect all admin routes with role check
```

### Delivery Partner App

```
⚠️  CURRENT STATE: Navigation mock only

REQUIRED FLOW:
1. Enter phone number → POST /auth/send-otp
2. Enter OTP → POST /auth/verify-otp → receive accessToken
3. New partner → POST /auth/delivery/register
4. Store token same as Customer App
5. All delivery routes protected by role: delivery_partner
```

---

## 22. Error Handling & Response Format

### Success Response

```json
{
  "success": true,
  "message": "Optional success message",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "Email is already registered" }
  ],
  "statusCode": 409
}
```

### Standard HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request / Validation error |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (valid token but insufficient role) |
| `404` | Not Found |
| `409` | Conflict (e.g. duplicate email) |
| `422` | Unprocessable Entity |
| `429` | Rate Limit Exceeded |
| `500` | Internal Server Error |

---

## 23. Redis Caching Strategy

| Key Pattern | TTL | Used For |
|---|---|---|
| `categories:all` | 1 hour | GET /categories (rarely changes) |
| `product:<id>` | 30 min | GET /products/:id |
| `products:list:<hash>` | 5 min | GET /products (paginated, filtered) |
| `cart:<userId>` | 7 days | User cart state |
| `session:<userId>` | 24 hours | Active session tracking |
| `otp:<phone>` | 5 min | Delivery partner OTP |

**Enable Redis:** Set `USE_REDIS=true` in `.env`. Falls back to DB if Redis is unavailable.

---

## 24. Roles & Permissions Matrix

| Role | Login via | Permissions |
|---|---|---|
| `user` | Email + password | Own cart, orders, addresses, profile |
| `admin` | Email + password | All of the above + products CRUD, categories CRUD, all orders, analytics, notifications, banners, coupons, customer list, inventory |
| `delivery_partner` | Phone + OTP | Own dashboard, assigned orders, earnings, location updates |
| `seller` | Email + password (future) | Product CRUD for their own store, own order fulfillment |

---

## 25. Frontend Gap Analysis

### Critical Missing Pieces (Build Immediately)

| Priority | Gap | Affects |
|---|---|---|
| P0 | All Customer App screens still use **Context/mock** instead of real API | Customer App entire app flow |
| P0 | Seller Dashboard uses **MockStorage** auth — no real login | Seller Dashboard completely |
| P0 | Delivery App has **no API calls at all** — all mock data | Delivery App completely |
| P1 | `/api/v1/addresses` — entire module missing | Checkout, Address management |
| P1 | `/api/v1/banners` — module missing | Home screen HeroSlider |
| P1 | `/api/v1/coupons` — module missing | Checkout coupon input |
| P1 | `/api/v1/notifications` — module missing | Customer notifications + Seller broadcast |
| P1 | Seller & Delivery auth roles (`admin`, `delivery_partner`) not in User model | Role-based access |
| P2 | `/api/v1/reviews` — module missing | OrderDetailsScreen Review button |
| P2 | Push notification FCM integration — not wired | All notification screens |
| P2 | Delivery OTP generation/verification — not implemented | Delivery partner auth + order delivery verification |
| P2 | Real-time location update endpoint — not implemented | Live tracking screen |
| P3 | Payment card save/manage API — not implemented | PaymentMethodsScreen |
| P3 | Seller Dashboard admin analytics — static data | AdminOverview + AnalyticsPage |

---

## 26. Setup & Running Locally

### Prerequisites

- Node.js v18+
- MongoDB v6+ (local or Atlas)
- Redis v7+ (optional but recommended)
- Cloudinary account
- Razorpay test account

### Installation

```bash
# Clone and navigate
cd Phool-Basket-APP-main/backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Seed initial data (categories + admin user)
node scripts/seed.js

# Start development server
npm run dev

# Start production
npm start
```

### Test Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@phoolbasket.com | Admin@123 |
| Customer | user@phoolbasket.com | User@123 |

### Verify API is Running

```bash
curl http://localhost:5000/health
# {"status":"ok","timestamp":"..."}
```

---

## 27. Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Replace all `.env` secrets with strong random values
- [ ] Enable Redis: `USE_REDIS=true`
- [ ] Configure MongoDB Atlas URI
- [ ] Configure Cloudinary production bucket
- [ ] Configure Razorpay live keys (`rzp_live_...`)
- [ ] Set `CLIENT_URL` to production frontend URL for CORS
- [ ] Configure FCM server key for push notifications
- [ ] Configure Twilio/MSG91 for OTP delivery
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up PM2 or Docker for process management
- [ ] Configure Winston log rotation
- [ ] Set up MongoDB indexes (run `scripts/ensureIndexes.js`)
- [ ] Add rate limiting for `/auth/*` routes
- [ ] Enable Helmet.js security headers
- [ ] Set up health check endpoint for load balancer
- [ ] Configure backup strategy for MongoDB

---

*Generated from full frontend analysis of:*
- *Customer App — 21 screens, 5 context providers, 1 existing backend*
- *Seller Dashboard — 13 screens, mock auth, all static data*
- *Delivery Partner App — 15 screens (Expo Router TypeScript), fully static*
