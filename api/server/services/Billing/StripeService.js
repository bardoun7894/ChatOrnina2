const { logger } = require('@librechat/data-schemas');

/**
 * Stripe Service for subscription and payment management
 * Note: Install 'stripe' package: npm install stripe
 */

let stripe;

// Initialize Stripe only if API key is provided
function initializeStripe() {
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = require('stripe');
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia',
      });
      logger.info('[StripeService] Stripe initialized successfully');
      return true;
    } catch (error) {
      logger.warn('[StripeService] Stripe package not installed. Run: npm install stripe');
      return false;
    }
  } else {
    logger.warn('[StripeService] STRIPE_SECRET_KEY not set. Stripe features disabled');
    return false;
  }
}

/**
 * Subscription tier configuration
 */
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    stripePriceId: null,
    quotas: {
      messages: 50,
      images: 5,
      videos: 0,
      codeGenerations: 10,
      designAnalyses: 2,
    },
  },
  basic: {
    name: 'Basic',
    price: 9.99,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
    quotas: {
      messages: 500,
      images: 50,
      videos: 5,
      codeGenerations: 100,
      designAnalyses: 20,
    },
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    quotas: {
      messages: 2000,
      images: 200,
      videos: 30,
      codeGenerations: 500,
      designAnalyses: 100,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    quotas: {
      messages: -1, // unlimited
      images: -1,
      videos: -1,
      codeGenerations: -1,
      designAnalyses: -1,
    },
  },
};

/**
 * Create Stripe customer
 */
async function createCustomer(user) {
  if (!stripe) {
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString(),
      },
    });

    logger.info(`[StripeService] Created customer: ${customer.id} for user: ${user._id}`);
    return customer;
  } catch (error) {
    logger.error('[StripeService] Error creating customer:', error);
    throw error;
  }
}

/**
 * Create checkout session for subscription
 */
async function createCheckoutSession({ userId, tier, successUrl, cancelUrl }) {
  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig || !tierConfig.stripePriceId) {
    throw new Error(`Invalid subscription tier: ${tier}`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: tierConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        tier,
      },
    });

    logger.info(`[StripeService] Created checkout session: ${session.id} for user: ${userId}`);
    return session;
  } catch (error) {
    logger.error('[StripeService] Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    logger.info(`[StripeService] Canceled subscription: ${subscriptionId}`);
    return subscription;
  } catch (error) {
    logger.error('[StripeService] Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Get subscription tier quotas
 */
function getTierQuotas(tier) {
  return SUBSCRIPTION_TIERS[tier]?.quotas || SUBSCRIPTION_TIERS.free.quotas;
}

// Initialize on module load
const isInitialized = initializeStripe();

module.exports = {
  stripe,
  isInitialized,
  SUBSCRIPTION_TIERS,
  createCustomer,
  createCheckoutSession,
  cancelSubscription,
  getTierQuotas,
};
