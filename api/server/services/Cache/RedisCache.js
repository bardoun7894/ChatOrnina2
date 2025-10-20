const { logger } = require('@librechat/data-schemas');

/**
 * Redis Cache Service
 * Provides caching layer for frequently accessed data
 * Falls back gracefully if Redis is not configured
 */

let redis = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection
 * @returns {boolean} - True if Redis is available
 */
function initializeRedis() {
  if (!process.env.REDIS_URI) {
    logger.info('[RedisCache] Redis not configured, caching disabled');
    return false;
  }

  try {
    const Redis = require('ioredis');

    redis = new Redis(process.env.REDIS_URI, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redis.on('connect', () => {
      logger.info('[RedisCache] Connected to Redis');
      isRedisAvailable = true;
    });

    redis.on('error', (err) => {
      logger.error('[RedisCache] Redis error:', err);
      isRedisAvailable = false;
    });

    redis.on('close', () => {
      logger.warn('[RedisCache] Redis connection closed');
      isRedisAvailable = false;
    });

    return true;
  } catch (error) {
    logger.error('[RedisCache] Failed to initialize Redis:', error);
    isRedisAvailable = false;
    return false;
  }
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Cached value or null
 */
async function get(key) {
  if (!isRedisAvailable || !redis) {
    return null;
  }

  try {
    const value = await redis.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    logger.error('[RedisCache] Get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<boolean>} - Success status
 */
async function set(key, value, ttl = 300) {
  if (!isRedisAvailable || !redis) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    logger.error('[RedisCache] Set error:', error);
    return false;
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
async function del(key) {
  if (!isRedisAvailable || !redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.error('[RedisCache] Delete error:', error);
    return false;
  }
}

/**
 * Delete multiple keys by pattern
 * @param {string} pattern - Key pattern (e.g., "user:*")
 * @returns {Promise<number>} - Number of keys deleted
 */
async function deletePattern(pattern) {
  if (!isRedisAvailable || !redis) {
    return 0;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    logger.error('[RedisCache] Delete pattern error:', error);
    return 0;
  }
}

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function exists(key) {
  if (!isRedisAvailable || !redis) {
    return false;
  }

  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('[RedisCache] Exists error:', error);
    return false;
  }
}

/**
 * Get or set pattern - get from cache, or compute and cache if not present
 * @param {string} key - Cache key
 * @param {Function} computeFn - Async function to compute value if not cached
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Cached or computed value
 */
async function getOrSet(key, computeFn, ttl = 300) {
  // Try to get from cache
  const cached = await get(key);
  if (cached !== null) {
    logger.debug(`[RedisCache] Cache hit: ${key}`);
    return cached;
  }

  logger.debug(`[RedisCache] Cache miss: ${key}`);

  // Compute value
  const value = await computeFn();

  // Cache the result
  await set(key, value, ttl);

  return value;
}

/**
 * Increment a counter in cache
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds (only for first set)
 * @returns {Promise<number>} - New counter value
 */
async function increment(key, ttl = 3600) {
  if (!isRedisAvailable || !redis) {
    return 0;
  }

  try {
    const value = await redis.incr(key);

    // Set TTL only if this is the first increment
    if (value === 1 && ttl > 0) {
      await redis.expire(key, ttl);
    }

    return value;
  } catch (error) {
    logger.error('[RedisCache] Increment error:', error);
    return 0;
  }
}

/**
 * Set expiration time for a key
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>}
 */
async function expire(key, ttl) {
  if (!isRedisAvailable || !redis) {
    return false;
  }

  try {
    await redis.expire(key, ttl);
    return true;
  } catch (error) {
    logger.error('[RedisCache] Expire error:', error);
    return false;
  }
}

/**
 * Get time to live for a key
 * @param {string} key - Cache key
 * @returns {Promise<number>} - TTL in seconds, -1 if no expiry, -2 if key doesn't exist
 */
async function ttl(key) {
  if (!isRedisAvailable || !redis) {
    return -2;
  }

  try {
    return await redis.ttl(key);
  } catch (error) {
    logger.error('[RedisCache] TTL error:', error);
    return -2;
  }
}

/**
 * Flush all cache entries (use with caution!)
 * @returns {Promise<boolean>}
 */
async function flushAll() {
  if (!isRedisAvailable || !redis) {
    return false;
  }

  try {
    await redis.flushall();
    logger.warn('[RedisCache] All cache entries flushed');
    return true;
  } catch (error) {
    logger.error('[RedisCache] Flush all error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
async function getStats() {
  if (!isRedisAvailable || !redis) {
    return { available: false };
  }

  try {
    const info = await redis.info('stats');
    const dbSize = await redis.dbsize();

    return {
      available: true,
      connected: isRedisAvailable,
      dbSize,
      info: info.split('\r\n').reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {}),
    };
  } catch (error) {
    logger.error('[RedisCache] Get stats error:', error);
    return { available: false, error: error.message };
  }
}

/**
 * Close Redis connection
 */
async function close() {
  if (redis) {
    await redis.quit();
    logger.info('[RedisCache] Connection closed');
  }
}

// Cache key generators for common patterns
const CacheKeys = {
  dashboard: (userId) => `dashboard:${userId}`,
  userSession: (userId) => `session:${userId}`,
  stripeCustomer: (customerId) => `stripe:customer:${customerId}`,
  usageStats: (userId) => `usage:${userId}`,
  apiResponse: (endpoint, params) => `api:${endpoint}:${JSON.stringify(params)}`,
  rateLimit: (userId, resource) => `ratelimit:${userId}:${resource}`,
};

module.exports = {
  initializeRedis,
  get,
  set,
  del,
  deletePattern,
  exists,
  getOrSet,
  increment,
  expire,
  ttl,
  flushAll,
  getStats,
  close,
  CacheKeys,
  isAvailable: () => isRedisAvailable,
};
