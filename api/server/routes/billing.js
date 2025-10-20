const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const { logger } = require('@librechat/data-schemas');
const StripeService = require('~/server/services/Billing/StripeService');

const router = express.Router();

/**
 * Create Stripe checkout session for subscription
 */
router.post('/create-checkout', requireJwtAuth, async (req, res) => {
  try {
    const { tier, successUrl, cancelUrl } = req.body;
    const userId = req.user._id.toString();

    if (!tier || !successUrl || !cancelUrl) {
      return res.status(400).json({
        message: 'Missing required fields: tier, successUrl, cancelUrl',
      });
    }

    if (!StripeService.initializeStripe()) {
      return res.status(503).json({
        message: 'Stripe payment processing is not configured',
      });
    }

    const session = await StripeService.createCheckoutSession({
      userId,
      tier,
      successUrl,
      cancelUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('[BillingRoutes] Checkout creation failed:', error);
    res.status(500).json({
      message: 'Failed to create checkout session',
      error: error.message,
    });
  }
});

/**
 * Cancel user's subscription
 */
router.post('/cancel-subscription', requireJwtAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({
        message: 'No active subscription found',
      });
    }

    if (!StripeService.initializeStripe()) {
      return res.status(503).json({
        message: 'Stripe payment processing is not configured',
      });
    }

    await StripeService.cancelSubscription(user.stripeSubscriptionId);

    // Update user status
    user.subscriptionStatus = 'canceled';
    await user.save();

    res.json({
      message: 'Subscription canceled successfully',
      subscription: {
        status: 'canceled',
        endDate: user.subscriptionEndDate,
      },
    });
  } catch (error) {
    logger.error('[BillingRoutes] Subscription cancellation failed:', error);
    res.status(500).json({
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
});

/**
 * Stripe webhook handler for subscription events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('[BillingRoutes] Webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  if (!StripeService.initializeStripe()) {
    return res.status(503).send('Stripe not configured');
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    logger.info('[BillingRoutes] Webhook event received:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        logger.info(`[BillingRoutes] Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('[BillingRoutes] Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session) {
  const { User } = require('~/db/models');

  try {
    const userId = session.metadata.userId;
    const tier = session.metadata.tier;

    const user = await User.findById(userId);
    if (!user) {
      logger.error('[BillingRoutes] User not found:', userId);
      return;
    }

    user.subscriptionTier = tier;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = new Date();
    user.stripeCustomerId = session.customer;
    user.stripeSubscriptionId = session.subscription;

    // Set quotas based on tier
    user.usageQuota = StripeService.getTierQuotas(tier);

    await user.save();
    logger.info('[BillingRoutes] Subscription activated for user:', userId);
  } catch (error) {
    logger.error('[BillingRoutes] Checkout completion error:', error);
  }
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(subscription) {
  const { User } = require('~/db/models');

  try {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    if (!user) {
      logger.error('[BillingRoutes] User not found for subscription:', subscription.id);
      return;
    }

    user.subscriptionStatus = subscription.status;
    user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);

    await user.save();
    logger.info('[BillingRoutes] Subscription updated for user:', user._id);
  } catch (error) {
    logger.error('[BillingRoutes] Subscription update error:', error);
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription) {
  const { User } = require('~/db/models');

  try {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    if (!user) {
      logger.error('[BillingRoutes] User not found for subscription:', subscription.id);
      return;
    }

    user.subscriptionTier = 'free';
    user.subscriptionStatus = 'inactive';
    user.usageQuota = StripeService.getTierQuotas('free');

    await user.save();
    logger.info('[BillingRoutes] Subscription deleted for user:', user._id);
  } catch (error) {
    logger.error('[BillingRoutes] Subscription deletion error:', error);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  const { User } = require('~/db/models');

  try {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    if (!user) {
      logger.error('[BillingRoutes] User not found for customer:', invoice.customer);
      return;
    }

    // Extend subscription end date
    if (invoice.lines.data[0]?.period?.end) {
      user.subscriptionEndDate = new Date(invoice.lines.data[0].period.end * 1000);
      await user.save();
    }

    logger.info('[BillingRoutes] Payment succeeded for user:', user._id);
  } catch (error) {
    logger.error('[BillingRoutes] Payment success handler error:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const { User } = require('~/db/models');

  try {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    if (!user) {
      logger.error('[BillingRoutes] User not found for customer:', invoice.customer);
      return;
    }

    user.subscriptionStatus = 'past_due';
    await user.save();

    logger.warn('[BillingRoutes] Payment failed for user:', user._id);
    // TODO: Send email notification to user
  } catch (error) {
    logger.error('[BillingRoutes] Payment failure handler error:', error);
  }
}

module.exports = router;
