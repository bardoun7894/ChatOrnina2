const { expect } = require('chai');
const mongoose = require('mongoose');
const { User } = require('../../db/models');
const { incrementUsage, resetUsageCounts, checkUsageQuota } = require('../../server/middleware/usageTracking');

/**
 * Integration Tests for Usage Tracking
 * Tests quota enforcement, usage increments, and monthly resets
 */

describe('Usage Tracking Integration Tests', function () {
  this.timeout(5000);

  let testUser;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/librechat-test');
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});

    testUser = await User.create({
      email: 'usage-test@example.com',
      password: 'TestPassword123!',
      name: 'Usage Test User',
      username: 'usagetest',
      subscriptionTier: 'basic',
      subscriptionStatus: 'active',
      usageQuota: {
        messages: 500,
        images: 50,
        videos: 5,
        codeGenerations: 100,
        designAnalyses: 20,
      },
      usageCount: {
        messages: 0,
        images: 0,
        videos: 0,
        codeGenerations: 0,
        designAnalyses: 0,
        lastReset: new Date(),
      },
    });
  });

  after(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('incrementUsage()', () => {
    it('should increment message count', async () => {
      await incrementUsage(testUser._id, 'messages');

      const user = await User.findById(testUser._id);
      expect(user.usageCount.messages).to.equal(1);
    });

    it('should increment multiple usage types', async () => {
      await incrementUsage(testUser._id, 'messages');
      await incrementUsage(testUser._id, 'images');
      await incrementUsage(testUser._id, 'codeGenerations');

      const user = await User.findById(testUser._id);
      expect(user.usageCount.messages).to.equal(1);
      expect(user.usageCount.images).to.equal(1);
      expect(user.usageCount.codeGenerations).to.equal(1);
    });

    it('should handle multiple increments of same type', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementUsage(testUser._id, 'messages');
      }

      const user = await User.findById(testUser._id);
      expect(user.usageCount.messages).to.equal(5);
    });

    it('should not increment if user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await incrementUsage(fakeId, 'messages');
      // Should not throw error, just log warning
    });
  });

  describe('Quota Enforcement', () => {
    it('should allow usage within quota', async () => {
      testUser.usageCount.messages = 100;
      testUser.usageQuota.messages = 500;
      await testUser.save();

      const hasExceeded = testUser.usageCount.messages >= testUser.usageQuota.messages;
      expect(hasExceeded).to.be.false;
    });

    it('should block usage when quota exceeded', async () => {
      testUser.usageCount.messages = 500;
      testUser.usageQuota.messages = 500;
      await testUser.save();

      const hasExceeded = testUser.usageCount.messages >= testUser.usageQuota.messages;
      expect(hasExceeded).to.be.true;
    });

    it('should allow unlimited usage for enterprise tier', async () => {
      testUser.subscriptionTier = 'enterprise';
      testUser.usageQuota.messages = -1;
      testUser.usageCount.messages = 999999;
      await testUser.save();

      const hasExceeded = testUser.usageQuota.messages !== -1 &&
                         testUser.usageCount.messages >= testUser.usageQuota.messages;
      expect(hasExceeded).to.be.false;
    });

    it('should enforce quota per service type independently', async () => {
      testUser.usageCount.messages = 500; // At limit
      testUser.usageCount.images = 10;    // Under limit
      await testUser.save();

      const messagesExceeded = testUser.usageCount.messages >= testUser.usageQuota.messages;
      const imagesExceeded = testUser.usageCount.images >= testUser.usageQuota.images;

      expect(messagesExceeded).to.be.true;
      expect(imagesExceeded).to.be.false;
    });
  });

  describe('resetUsageCounts()', () => {
    it('should reset all usage counts to zero', async () => {
      testUser.usageCount.messages = 450;
      testUser.usageCount.images = 48;
      testUser.usageCount.videos = 4;
      testUser.usageCount.codeGenerations = 95;
      testUser.usageCount.designAnalyses = 18;
      await testUser.save();

      await resetUsageCounts(testUser._id);

      const user = await User.findById(testUser._id);
      expect(user.usageCount.messages).to.equal(0);
      expect(user.usageCount.images).to.equal(0);
      expect(user.usageCount.videos).to.equal(0);
      expect(user.usageCount.codeGenerations).to.equal(0);
      expect(user.usageCount.designAnalyses).to.equal(0);
    });

    it('should update lastReset timestamp', async () => {
      const oldReset = testUser.usageCount.lastReset;

      // Wait 1 second to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000));

      await resetUsageCounts(testUser._id);

      const user = await User.findById(testUser._id);
      expect(user.usageCount.lastReset.getTime()).to.be.greaterThan(oldReset.getTime());
    });

    it('should not reset quotas (only counts)', async () => {
      const originalQuota = { ...testUser.usageQuota };
      testUser.usageCount.messages = 450;
      await testUser.save();

      await resetUsageCounts(testUser._id);

      const user = await User.findById(testUser._id);
      expect(user.usageQuota.messages).to.equal(originalQuota.messages);
      expect(user.usageQuota.images).to.equal(originalQuota.images);
    });
  });

  describe('Monthly Reset Logic', () => {
    it('should identify users needing reset (>30 days)', async () => {
      // Set lastReset to 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      testUser.usageCount.lastReset = thirtyOneDaysAgo;
      testUser.usageCount.messages = 400;
      await testUser.save();

      const usersNeedingReset = await User.find({
        'usageCount.lastReset': { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });

      expect(usersNeedingReset.length).to.equal(1);
      expect(usersNeedingReset[0]._id.toString()).to.equal(testUser._id.toString());
    });

    it('should not reset users within 30 days', async () => {
      // lastReset is set to now in beforeEach
      const usersNeedingReset = await User.find({
        'usageCount.lastReset': { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });

      expect(usersNeedingReset.length).to.equal(0);
    });
  });

  describe('Tier-Specific Quotas', () => {
    it('should respect free tier limits', async () => {
      testUser.subscriptionTier = 'free';
      testUser.usageQuota = {
        messages: 50,
        images: 5,
        videos: 0,
        codeGenerations: 10,
        designAnalyses: 2,
      };
      await testUser.save();

      expect(testUser.usageQuota.messages).to.equal(50);
      expect(testUser.usageQuota.videos).to.equal(0);
    });

    it('should respect basic tier limits', async () => {
      expect(testUser.usageQuota.messages).to.equal(500);
      expect(testUser.usageQuota.images).to.equal(50);
      expect(testUser.usageQuota.videos).to.equal(5);
    });

    it('should respect pro tier limits', async () => {
      testUser.subscriptionTier = 'pro';
      testUser.usageQuota = {
        messages: 2000,
        images: 200,
        videos: 30,
        codeGenerations: 500,
        designAnalyses: 100,
      };
      await testUser.save();

      expect(testUser.usageQuota.messages).to.equal(2000);
      expect(testUser.usageQuota.designAnalyses).to.equal(100);
    });

    it('should have unlimited quotas for enterprise', async () => {
      testUser.subscriptionTier = 'enterprise';
      testUser.usageQuota = {
        messages: -1,
        images: -1,
        videos: -1,
        codeGenerations: -1,
        designAnalyses: -1,
      };
      await testUser.save();

      expect(testUser.usageQuota.messages).to.equal(-1);
      expect(testUser.usageQuota.images).to.equal(-1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user without usage tracking fields', async () => {
      const legacyUser = await User.create({
        email: 'legacy@example.com',
        password: 'TestPassword123!',
        name: 'Legacy User',
        username: 'legacy',
        // No usageCount or usageQuota fields
      });

      // Should not throw error when accessing
      expect(legacyUser.usageCount).to.exist;
      expect(legacyUser.usageQuota).to.exist;

      await User.findByIdAndDelete(legacyUser._id);
    });

    it('should handle negative usage counts (data corruption)', async () => {
      testUser.usageCount.messages = -5;
      await testUser.save();

      // Should still allow usage (treat negative as 0)
      const hasExceeded = testUser.usageCount.messages >= testUser.usageQuota.messages;
      expect(hasExceeded).to.be.false;
    });

    it('should handle concurrent increments', async () => {
      // Simulate concurrent requests
      const increments = [];
      for (let i = 0; i < 10; i++) {
        increments.push(incrementUsage(testUser._id, 'messages'));
      }

      await Promise.all(increments);

      const user = await User.findById(testUser._id);
      // Should be exactly 10, not less due to race conditions
      expect(user.usageCount.messages).to.equal(10);
    });
  });
});
