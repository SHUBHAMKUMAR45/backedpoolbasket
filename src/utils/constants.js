export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  DELIVERY_PARTNER: 'delivery_partner'
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const DELIVERY_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REACHED_STORE: 'reached_store',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered'
};

export const REDIS_KEYS = {
  CART: 'cart:',
  PRODUCT_CACHE: 'product:',
  PRODUCTS_LIST: 'products:list:',
  CATEGORIES: 'categories:all',
  USER_SESSION: 'session:',
  OTP: 'otp:'
};

export const CACHE_TTL = {
  SHORT: 300,        // 5 minutes
  MEDIUM: 1800,      // 30 minutes
  LONG: 3600,        // 1 hour
  DAY: 86400,        // 24 hours
  CART: 604800,      // 7 days
  OTP: 300           // 5 minutes
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50
};
