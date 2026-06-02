# 🌸 Phool Basket — Express REST API Backend

This is the production-grade, scalable Node.js Express backend serving all three frontend clients for the **Phool Basket** flower and gifting platform:
1. **Customer App** (React Native / Expo)
2. **Seller Dashboard** (React Native / Expo)
3. **Delivery Partner App** (Expo Router / TypeScript)

---

## 🚀 Key Features

* **Rotating JWT Session Tokens** (Access + Refresh tokens)
* **Mobile OTP Authentication** for delivery riders (with mock and Twilio modes)
* **MongoDB Aggregations** for real-time dashboard stats and charts
* **Bcrypt & Joi Payload Validation**
* **Memory-buffered Uploads** with Cloudinary image management
* **Razorpay Payment Gateway Integration** (with signature checks and developer mock mode)
* **Batched Push Notifications** via Firebase Cloud Messaging
* **Robust Security Middlewares** (Helmet, HPP, CORS, Mongo Sanitize, Rate Limiter)

---

## 🛠️ Prerequisites

* **Node.js** (v18 or higher recommended)
* **MongoDB** (running locally or via Atlas)
* **Redis** (running locally, optional - default falls back to map-mocks if `USE_REDIS=false`)

---

## 📦 Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

3. **Verify Dev Settings** (in `.env`):
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/phool-basket
   USE_REDIS=false  # Set to true if you have Redis running
   ```

---

## 🏃 Running the Application

* **Development (Auto-reload)**:
  ```bash
  npm run dev
  ```

* **Production (Direct Node)**:
  ```bash
  npm start
  ```

Once started, test health check statuses by querying:
`GET http://localhost:5000/health`

---

## 📂 Architecture Layout

```
backend/
├── server.js                   # HTTP entry point & DB connection initialization
├── .env                        # Local dev environment configurations
├── package.json                # Project declarations and dependencies
├── scripts/
│   └── seed.js                 # Idempotent DB seeder
└── src/
    ├── app.js                  # Security settings & router mounts
    ├── config/                 # Redis, DB, Razorpay, Cloudinary, FCM configs
    ├── controllers/            # Controller layers (thin routing mappings)
    ├── services/               # Business logic core layers
    ├── models/                 # Mongoose models schemas definitions
    ├── middlewares/            # Error handlers, rate limiters, token parsers
    ├── routes/                 # Express route mappings
    ├── validators/             # Joi input payload schemas
    └── utils/                  # Winston logger, constants, helpers
```
