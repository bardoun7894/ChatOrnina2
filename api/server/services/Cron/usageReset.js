const cron = require('node-cron');
const { logger } = require('@librechat/data-schemas');
const { User } = require('~/db/models');

/**
 * Usage Reset Cron Job
 * Resets all users' usage counts on the 1st of each month at midnight
 */

let cronJob = null;

/**
 * Reset usage counts for all users who need it (30+ days since last reset)
 * @returns {Promise<number>} Number of users reset
 */
async function resetMonthlyUsage() {
  try {
    logger.info('[UsageReset] Starting monthly usage reset...');

    // Find users who haven't been reset in 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const usersToReset = await User.find({
      $or: [
        { 'usageCount.lastReset': { $lt: thirtyDaysAgo } },
        { 'usageCount.lastReset': { $exists: false } },
      ],
    });

    logger.info(`[UsageReset] Found ${usersToReset.length} users to reset`);

    let resetCount = 0;
    const errors = [];

    // Reset each user
    for (const user of usersToReset) {
      try {
        user.usageCount = {
          messages: 0,
          images: 0,
          videos: 0,
          codeGenerations: 0,
          designAnalyses: 0,
          lastReset: new Date(),
        };

        await user.save();
        resetCount++;

        if (resetCount % 100 === 0) {
          logger.info(`[UsageReset] Progress: ${resetCount}/${usersToReset.length} users reset`);
        }
      } catch (error) {
        errors.push({
          userId: user._id,
          error: error.message,
        });
      }
    }

    logger.info(`[UsageReset] Monthly reset complete: ${resetCount} users reset`);

    if (errors.length > 0) {
      logger.warn(`[UsageReset] ${errors.length} errors occurred:`, errors);
    }

    return resetCount;
  } catch (error) {
    logger.error('[UsageReset] Monthly reset failed:', error);
    throw error;
  }
}

/**
 * Initialize the cron job
 * Runs on the 1st of every month at 00:00 (midnight)
 */
function initializeUsageResetCron() {
  if (cronJob) {
    logger.warn('[UsageReset] Cron job already initialized');
    return;
  }

  // Cron schedule: '0 0 1 * *' = At 00:00 on day-of-month 1
  cronJob = cron.schedule(
    '0 0 1 * *',
    async () => {
      logger.info('[UsageReset] Cron job triggered');
      try {
        await resetMonthlyUsage();
      } catch (error) {
        logger.error('[UsageReset] Cron job failed:', error);
      }
    },
    {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'UTC',
    },
  );

  logger.info('[UsageReset] Cron job initialized (runs 1st of each month at midnight)');
}

/**
 * Stop the cron job
 */
function stopUsageResetCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('[UsageReset] Cron job stopped');
  }
}

/**
 * Get cron job status
 * @returns {Object}
 */
function getStatus() {
  return {
    running: cronJob !== null,
    schedule: '0 0 1 * *', // 1st of every month at midnight
    timezone: process.env.TIMEZONE || 'UTC',
    description: 'Monthly usage reset on the 1st of each month',
  };
}

/**
 * Manually trigger usage reset (for testing or admin purposes)
 * @returns {Promise<number>} Number of users reset
 */
async function manualReset() {
  logger.info('[UsageReset] Manual reset triggered');
  return await resetMonthlyUsage();
}

module.exports = {
  initializeUsageResetCron,
  stopUsageResetCron,
  resetMonthlyUsage,
  manualReset,
  getStatus,
};
