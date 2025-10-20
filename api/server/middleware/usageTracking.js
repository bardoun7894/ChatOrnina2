const { logger } = require('@librechat/data-schemas');
const { getTierQuotas } = require('~/server/services/Billing/StripeService');

/**
 * Usage tracking types
 */
const UsageType = {
  MESSAGE: 'messages',
  IMAGE: 'images',
  VIDEO: 'videos',
  CODE: 'codeGenerations',
  DESIGN: 'designAnalyses',
};

/**
 * Check if user has exceeded usage quota
 */
function hasExceededQuota(user, usageType) {
  const quotas = getTierQuotas(user.subscriptionTier || 'free');
  const quota = quotas[usageType];
  const usage = user.usageCount?.[usageType] || 0;

  // -1 means unlimited
  if (quota === -1) {
    return false;
  }

  return usage >= quota;
}

/**
 * Middleware to check usage quota before action
 */
function checkUsageQuota(usageType) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const User = require('~/models').User;
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user has exceeded quota
      if (hasExceededQuota(user, usageType)) {
        const quotas = getTierQuotas(user.subscriptionTier || 'free');
        logger.warn(`[UsageTracking] User ${user._id} exceeded ${usageType} quota`);
        
        return res.status(429).json({
          message: 'Usage quota exceeded',
          error: `You have reached your ${usageType} quota for this billing period`,
          quota: quotas[usageType],
          usage: user.usageCount?.[usageType] || 0,
          tier: user.subscriptionTier || 'free',
          upgradeRequired: true,
        });
      }

      // Attach user to request for later use
      req.userWithQuota = user;
      next();
    } catch (error) {
      logger.error('[UsageTracking] Error checking usage quota:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
}

/**
 * Increment usage count after successful action
 */
async function incrementUsage(userId, usageType) {
  try {
    const User = require('~/models').User;
    const updateField = `usageCount.${usageType}`;
    
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { [updateField]: 1 },
      },
      { new: true }
    );

    logger.debug(`[UsageTracking] Incremented ${usageType} for user ${userId}`);
  } catch (error) {
    logger.error('[UsageTracking] Error incrementing usage:', error);
  }
}

/**
 * Reset usage counts (should be called monthly/weekly based on billing cycle)
 */
async function resetUsageCounts(userId) {
  try {
    const User = require('~/models').User;
    const user = await User.findById(userId);
    
    if (!user) {
      return;
    }

    const quotas = getTierQuotas(user.subscriptionTier || 'free');
    
    await User.findByIdAndUpdate(
      userId,
      {
        usageCount: {
          messages: 0,
          images: 0,
          videos: 0,
          codeGenerations: 0,
          designAnalyses: 0,
          lastReset: new Date(),
        },
        usageQuota: quotas,
      },
      { new: true }
    );

    logger.info(`[UsageTracking] Reset usage counts for user ${userId}`);
  } catch (error) {
    logger.error('[UsageTracking] Error resetting usage counts:', error);
  }
}

module.exports = {
  UsageType,
  checkUsageQuota,
  incrementUsage,
  resetUsageCounts,
  hasExceededQuota,
};
