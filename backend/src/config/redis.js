import Redis from 'ioredis';
import environment from './environment.js';
import logger from '../utils/logger.js';

let redisClient = null;

const USE_REDIS = environment.USE_REDIS;

if (USE_REDIS) {
  try {
    redisClient = new Redis({
      host: environment.REDIS_HOST,
      port: environment.REDIS_PORT,
      password: environment.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected.');
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis client connection error: ${err.message}`);
    });
  } catch (error) {
    logger.error(`Failed to initialize Redis: ${error.message}`);
    redisClient = null;
  }
} else {
  logger.info('Redis is disabled (USE_REDIS=false). Using mock in-memory fallback.');
}

// No-op mock functions for local cache fallback when Redis is off
const mockCache = new Map();

export const get = async (key) => {
  if (USE_REDIS && redisClient) {
    try {
      return await redisClient.get(key);
    } catch (err) {
      logger.error(`Redis GET error for key ${key}: ${err.message}`);
      return null;
    }
  }
  const item = mockCache.get(key);
  if (item) {
    if (item.expiry && item.expiry < Date.now()) {
      mockCache.delete(key);
      return null;
    }
    return item.value;
  }
  return null;
};

export const set = async (key, value, ttlSeconds) => {
  if (USE_REDIS && redisClient) {
    try {
      if (ttlSeconds) {
        return await redisClient.set(key, value, 'EX', ttlSeconds);
      }
      return await redisClient.set(key, value);
    } catch (err) {
      logger.error(`Redis SET error for key ${key}: ${err.message}`);
      return null;
    }
  }
  const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  mockCache.set(key, { value: String(value), expiry });
  return 'OK';
};

export const del = async (key) => {
  if (USE_REDIS && redisClient) {
    try {
      if (key.endsWith('*')) {
        // B9 FIX: Wrap scanStream in a Promise so we actually AWAIT scan+delete completion.
        // Previously this returned 1 immediately while the scan was still running,
        // making wildcard cache invalidation a complete no-op.
        return new Promise((resolve, reject) => {
          const stream = redisClient.scanStream({ match: key, count: 100 });
          const pipeline = redisClient.pipeline();
          stream.on('data', (keys) => {
            if (keys.length) {
              keys.forEach((k) => pipeline.del(k));
            }
          });
          stream.on('end', () => {
            pipeline.exec().then(() => resolve(1)).catch(reject);
          });
          stream.on('error', (err) => {
            logger.error(`Redis SCAN stream error for key ${key}: ${err.message}`);
            reject(err);
          });
        });
      }
      return await redisClient.del(key);
    } catch (err) {
      logger.error(`Redis DEL error for key ${key}: ${err.message}`);
      return 0;
    }
  }
  
  if (key.endsWith('*')) {
    const prefix = key.slice(0, -1);
    for (const k of mockCache.keys()) {
      if (k.startsWith(prefix)) {
        mockCache.delete(k);
      }
    }
    return 1;
  }
  
  return mockCache.delete(key) ? 1 : 0;
};

export const exists = async (key) => {
  if (USE_REDIS && redisClient) {
    try {
      return await redisClient.exists(key);
    } catch (err) {
      logger.error(`Redis EXISTS error for key ${key}: ${err.message}`);
      return 0;
    }
  }
  const hasKey = mockCache.has(key);
  if (hasKey) {
    const item = mockCache.get(key);
    if (item.expiry && item.expiry < Date.now()) {
      mockCache.delete(key);
      return 0;
    }
    return 1;
  }
  return 0;
};

export const client = redisClient;
