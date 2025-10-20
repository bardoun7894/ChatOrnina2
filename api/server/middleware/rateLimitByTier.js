const { logger } = require('@librechat/data-schemas');
const RedisCache = require('~/server/services/Cache/RedisCache');

/**
 * Rate Limiting Middleware Per Subscription Tier
 * Enforces different rate limits based on user's subscription tier
 */

// Rate limit configurations per tier (requests per minute)
const TIER_RATE_LIMITS = {
  free: {
    requests: 20, // 20 requests per minute
    window: 60,   // 60 seconds
  },
  basic: {
    requests: 60, // 60 requests per minute
    window: 60,
  },
  pro: {
    requests: 200, // 200 requests per minute
    window: 60,
  },
  enterprise: {
    requests: 1000, // 1000 requests per minute
    window: 60,
  },
};

/**
 * Create rate limiter middleware for a specific resource
 * @param {string} resourceName - Name of the resource being rate limited
 * @returns {Function} Express middleware
 */
function createTierRateLimiter(resourceName = 'api') {
  return async (req, res, next) => {
    // Skip if user not authenticated
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const tier = req.user.subscriptionTier || 'free';

    // Get rate limit for user's tier
    const limit = TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.free;

    // Skip rate limiting if Redis not available (fallback to no limit)
    if (!RedisCache.isAvailable()) {
      logger.warn('[RateLimit] Redis not available, skipping rate limit check');
      return next();
    }

    try {
      // Create cache key for this user and resource
      const cacheKey = RedisCache.CacheKeys.rateLimit(userId, resourceName);

      // Increment request count
      const requestCount = await RedisCache.increment(cacheKey, limit.window);

      // Set headers for rate limit info
      res.setHeader('X-RateLimit-Limit', limit.requests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.requests - requestCount));
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + limit.window);

      // Check if limit exceeded
      if (requestCount > limit.requests) {
        logger.warn(`[RateLimit] User ${userId} exceeded ${tier} tier limit for ${resourceName}`);

        return res.status(429).json({
          message: 'Rate limit exceeded',
          tier,
          limit: limit.requests,
          window: limit.window,
          retryAfter: limit.window,
          upgradeAvailable: tier !== 'enterprise',
        });
      }

      next();
    } catch (error) {
      logger.error('[RateLimit] Error checking rate limit:', error);
      // On error, allow request to proceed (fail open)
      next();
    }
  };
}

/**
 * Rate limiter for chat/message endpoints
 */
const messageRateLimiter = createTierRateLimiter('messages');

/**
 * Rate limiter for AI service endpoints (code, design, video)
 */
const aiServiceRateLimiter = createTierRateLimiter('ai-services');

/**
 * Rate limiter for file upload endpoints
 */
const uploadRateLimiter = createTierRateLimiter('uploads');

/**
 * Rate limiter for API key usage (for enterprise tier)
 */
const apiKeyRateLimiter = createTierRateLimiter('api-key');

/**
 * Get current rate limit status for a user
 * @param {string} userId - User ID
 * @param {string} resourceName - Resource name
 * @returns {Promise<Object>} Rate limit status
 */
async function getRateLimitStatus(userId, resourceName = 'api') {
  if (!RedisCache.isAvailable()) {
    return { limited: false, message: 'Rate limiting unavailable' };
  }

  try {
    const cacheKey = RedisCache.CacheKeys.rateLimit(userId, resourceName);
    const requestCount = parseInt(await RedisCache.get(cacheKey)) || 0;
    const ttl = await RedisCache.ttl(cacheKey);

    // Get user's tier from database if needed
    // For now, assume we have it

    return {
      requestCount,
      resetIn: ttl > 0 ? ttl : 0,
      limited: false,
    };
  } catch (error) {
    logger.error('[RateLimit] Error getting rate limit status:', error);
    return { limited: false, error: error.message };
  }
}

/**
 * Reset rate limit for a user (admin function)
 * @param {string} userId - User ID
 * @param {string} resourceName - Resource name (optional, resets all if not provided)
 * @returns {Promise<boolean>}
 */
async function resetRateLimit(userId, resourceName = null) {
  if (!RedisCache.isAvailable()) {
    return false;
  }

  try {
    if (resourceName) {
      const cacheKey = RedisCache.CacheKeys.rateLimit(userId, resourceName);
      await RedisCache.del(cacheKey);
    } else {
      // Reset all rate limits for this user
      const pattern = `ratelimit:${userId}:*`;
      await RedisCache.deletePattern(pattern);
    }

    logger.info(`[RateLimit] Reset rate limit for user ${userId}`);
    return true;
  } catch (error) {
    logger.error('[RateLimit] Error resetting rate limit:', error);
    return false;
  }
}

module.exports = {
  createTierRateLimiter,
  messageRateLimiter,
  aiServiceRateLimiter,
  uploadRateLimiter,
  apiKeyRateLimiter,
  getRateLimitStatus,
  resetRateLimit,
  TIER_RATE_LIMITS,
};
