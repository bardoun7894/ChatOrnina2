const express = require('express');
const {
  updateUserPluginsController,
  resendVerificationController,
  getTermsStatusController,
  acceptTermsController,
  verifyEmailController,
  deleteUserController,
  getUserController,
} = require('~/server/controllers/UserController');
const { requireJwtAuth, canDeleteAccount, verifyEmailLimiter } = require('~/server/middleware');
const RedisCache = require('~/server/services/Cache/RedisCache');

const router = express.Router();

router.get('/', requireJwtAuth, getUserController);
router.get('/terms', requireJwtAuth, getTermsStatusController);
router.post('/terms/accept', requireJwtAuth, acceptTermsController);
router.post('/plugins', requireJwtAuth, updateUserPluginsController);
router.delete('/delete', requireJwtAuth, canDeleteAccount, deleteUserController);
router.post('/verify', verifyEmailController);
router.post('/verify/resend', verifyEmailLimiter, resendVerificationController);

// Dashboard endpoint - provides usage stats and subscription info
// Cached for 5 minutes to reduce database load
router.get('/dashboard', requireJwtAuth, async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id.toString();

    // Try to get from cache first
    const cacheKey = RedisCache.CacheKeys.dashboard(userId);
    const dashboardData = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Compute dashboard data if not cached
        return {
          usage: user.usageCount || {
            messages: 0,
            images: 0,
            videos: 0,
            codeGenerations: 0,
            designAnalyses: 0,
            lastReset: new Date(),
          },
          quota: user.usageQuota || {
            messages: 50,
            images: 5,
            videos: 0,
            codeGenerations: 10,
            designAnalyses: 2,
          },
          subscription: {
            tier: user.subscriptionTier || 'free',
            status: user.subscriptionStatus || 'inactive',
            startDate: user.subscriptionStartDate,
            endDate: user.subscriptionEndDate,
          },
        };
      },
      300, // Cache for 5 minutes
    );

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: error.message });
  }
});

module.exports = router;
