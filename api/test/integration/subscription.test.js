const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../../server');
const { User } = require('../../db/models');
const StripeService = require('../../server/services/Billing/StripeService');

/**
 * Integration Tests for Subscription Flow
 * Tests the complete subscription lifecycle from checkout to cancellation
 */

describe('Subscription Flow Integration Tests', function () {
  this.timeout(10000); // Stripe API calls can be slow

  let testUser;
  let authToken;

  before(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/librechat-test');
    }

    // Initialize Stripe service
    StripeService.initializeStripe();
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      username: 'testuser',
      subscriptionTier: 'free',
      subscriptionStatus: 'inactive',
    });

    // Get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    authToken = loginRes.body.token;
  });

  after(async () => {
    // Clean up
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/user/dashboard', () => {
    it('should return dashboard data for authenticated user', async () => {
      const res = await request(app)
        .get('/api/user/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).to.have.property('usage');
      expect(res.body).to.have.property('quota');
      expect(res.body).to.have.property('subscription');

      expect(res.body.subscription.tier).to.equal('free');
      expect(res.body.subscription.status).to.equal('inactive');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .get('/api/user/dashboard')
        .expect(401);
    });

    it('should return default quotas for new user', async () => {
      const res = await request(app)
        .get('/api/user/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.quota).to.deep.include({
        messages: 50,
        images: 5,
        videos: 0,
        codeGenerations: 10,
        designAnalyses: 2,
      });
    });
  });

  describe('POST /api/billing/create-checkout', () => {
    it('should create checkout session for valid tier', async () => {
      if (!process.env.STRIPE_SECRET_KEY) {
        this.skip(); // Skip if Stripe not configured
      }

      const res = await request(app)
        .post('/api/billing/create-checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tier: 'basic',
          successUrl: 'http://localhost:3080/success',
          cancelUrl: 'http://localhost:3080/cancel',
        })
        .expect(200);

      expect(res.body).to.have.property('url');
      expect(res.body.url).to.include('checkout.stripe.com');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/billing/create-checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tier: 'basic',
          // Missing successUrl and cancelUrl
        })
        .expect(400);

      expect(res.body.message).to.include('required fields');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .post('/api/billing/create-checkout')
        .send({
          tier: 'basic',
          successUrl: 'http://localhost:3080/success',
          cancelUrl: 'http://localhost:3080/cancel',
        })
        .expect(401);
    });
  });

  describe('POST /api/billing/cancel-subscription', () => {
    beforeEach(async () => {
      // Set up user with active subscription
      testUser.subscriptionTier = 'pro';
      testUser.subscriptionStatus = 'active';
      testUser.stripeSubscriptionId = 'sub_test_123';
      testUser.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await testUser.save();
    });

    it('should cancel active subscription', async () => {
      if (!process.env.STRIPE_SECRET_KEY) {
        this.skip(); // Skip if Stripe not configured
      }

      // Mock Stripe cancellation
      const originalCancel = StripeService.cancelSubscription;
      StripeService.cancelSubscription = async () => ({ status: 'canceled' });

      const res = await request(app)
        .post('/api/billing/cancel-subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.message).to.include('canceled successfully');
      expect(res.body.subscription.status).to.equal('canceled');

      // Restore original function
      StripeService.cancelSubscription = originalCancel;
    });

    it('should return 400 if no active subscription', async () => {
      // Remove subscription ID
      testUser.stripeSubscriptionId = null;
      await testUser.save();

      const res = await request(app)
        .post('/api/billing/cancel-subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.message).to.include('No active subscription');
    });
  });

  describe('Subscription Tier Quotas', () => {
    it('should have correct quotas for free tier', () => {
      const quotas = StripeService.getTierQuotas('free');

      expect(quotas).to.deep.equal({
        messages: 50,
        images: 5,
        videos: 0,
        codeGenerations: 10,
        designAnalyses: 2,
      });
    });

    it('should have correct quotas for basic tier', () => {
      const quotas = StripeService.getTierQuotas('basic');

      expect(quotas).to.deep.equal({
        messages: 500,
        images: 50,
        videos: 5,
        codeGenerations: 100,
        designAnalyses: 20,
      });
    });

    it('should have correct quotas for pro tier', () => {
      const quotas = StripeService.getTierQuotas('pro');

      expect(quotas).to.deep.equal({
        messages: 2000,
        images: 200,
        videos: 30,
        codeGenerations: 500,
        designAnalyses: 100,
      });
    });

    it('should have unlimited quotas for enterprise tier', () => {
      const quotas = StripeService.getTierQuotas('enterprise');

      expect(quotas).to.deep.equal({
        messages: -1,
        images: -1,
        videos: -1,
        codeGenerations: -1,
        designAnalyses: -1,
      });
    });
  });

  describe('Usage Tracking', () => {
    it('should initialize usage counts at zero for new user', async () => {
      const res = await request(app)
        .get('/api/user/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.usage).to.deep.include({
        messages: 0,
        images: 0,
        videos: 0,
        codeGenerations: 0,
        designAnalyses: 0,
      });
    });

    it('should update quota when tier changes', async () => {
      // Simulate tier upgrade
      testUser.subscriptionTier = 'pro';
      testUser.usageQuota = StripeService.getTierQuotas('pro');
      await testUser.save();

      const res = await request(app)
        .get('/api/user/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.quota.messages).to.equal(2000);
      expect(res.body.quota.images).to.equal(200);
    });
  });

  describe('Webhook Event Handling', () => {
    it('should handle checkout.session.completed event', async () => {
      // This would require mocking Stripe webhook events
      // Skipped for now - would need stripe-mock or similar
      this.skip();
    });

    it('should handle customer.subscription.updated event', async () => {
      this.skip();
    });

    it('should handle customer.subscription.deleted event', async () => {
      this.skip();
    });

    it('should handle invoice.payment_succeeded event', async () => {
      this.skip();
    });

    it('should handle invoice.payment_failed event', async () => {
      this.skip();
    });
  });
});
