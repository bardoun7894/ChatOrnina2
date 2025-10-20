import React, { useState } from 'react';
import { useRecoilValue } from 'recoil';
import store from '~/store';

/**
 * Subscription Management Component
 * Handles subscription upgrades, downgrades, and cancellations
 * Integrates with Stripe for payment processing
 */

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  quotas: {
    messages: number;
    images: number;
    videos: number;
    codeGenerations: number;
    designAnalyses: number;
  };
  popular?: boolean;
}

const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: [
      'Basic chat functionality',
      '50 messages per month',
      '5 image generations',
      '10 code generations',
      '2 design analyses',
      'Community support',
    ],
    quotas: {
      messages: 50,
      images: 5,
      videos: 0,
      codeGenerations: 10,
      designAnalyses: 2,
    },
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    period: 'month',
    features: [
      'Everything in Free',
      '500 messages per month',
      '50 image generations',
      '5 video generations',
      '100 code generations',
      '20 design analyses',
      'Email support',
      'Priority processing',
    ],
    quotas: {
      messages: 500,
      images: 50,
      videos: 5,
      codeGenerations: 100,
      designAnalyses: 20,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    period: 'month',
    features: [
      'Everything in Basic',
      '2,000 messages per month',
      '200 image generations',
      '30 video generations',
      '500 code generations',
      '100 design analyses',
      'Advanced AI models',
      'API access',
      'Priority support',
    ],
    quotas: {
      messages: 2000,
      images: 200,
      videos: 30,
      codeGenerations: 500,
      designAnalyses: 100,
    },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    period: 'month',
    features: [
      'Unlimited messages',
      'Unlimited image generations',
      'Unlimited video generations',
      'Unlimited code generations',
      'Unlimited design analyses',
      'Custom AI models',
      'Dedicated support',
      'SLA guarantees',
      'Team collaboration',
      'Custom integrations',
    ],
    quotas: {
      messages: -1,
      images: -1,
      videos: -1,
      codeGenerations: -1,
      designAnalyses: -1,
    },
  },
];

const SubscriptionManager: React.FC = () => {
  const user = useRecoilValue(store.user);
  const [currentTier, setCurrentTier] = useState<string>(user?.subscriptionTier || 'free');
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleSubscribe = async (tierId: string) => {
    if (tierId === 'free') {
      return; // Can't subscribe to free
    }

    setLoading(tierId);
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: tierId,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading('cancel');
    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      alert('Subscription canceled successfully. You will retain access until the end of your billing period.');
      setShowCancelDialog(false);
      window.location.reload();
    } catch (error) {
      console.error('Cancellation error:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getTierIndex = (tierId: string): number => {
    return subscriptionTiers.findIndex((t) => t.id === tierId);
  };

  const isUpgrade = (targetTier: string): boolean => {
    return getTierIndex(targetTier) > getTierIndex(currentTier);
  };

  const isDowngrade = (targetTier: string): boolean => {
    return getTierIndex(targetTier) < getTierIndex(currentTier);
  };

  const isCurrent = (tierId: string): boolean => {
    return tierId === currentTier;
  };

  const getButtonText = (tier: SubscriptionTier): string => {
    if (isCurrent(tier.id)) {
      return 'Current Plan';
    }
    if (tier.id === 'free') {
      return 'Free Forever';
    }
    if (isUpgrade(tier.id)) {
      return 'Upgrade';
    }
    if (isDowngrade(tier.id)) {
      return 'Downgrade';
    }
    return 'Subscribe';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="mt-4 text-xl text-gray-600">
            Select the perfect plan for your AI needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid gap-8 lg:grid-cols-4">
          {subscriptionTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl bg-white shadow-lg ${
                tier.popular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                  <span className="rounded-full bg-blue-600 px-4 py-1 text-sm font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>

                {/* Price */}
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-extrabold text-gray-900">
                    ${tier.price}
                  </span>
                  {tier.price > 0 && (
                    <span className="ml-2 text-gray-600">/{tier.period}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="mt-8 space-y-4">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-6 w-6 flex-shrink-0 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={isCurrent(tier.id) || tier.id === 'free' || loading !== null}
                  className={`mt-8 w-full rounded-lg px-6 py-3 text-center font-semibold transition-colors ${
                    isCurrent(tier.id)
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : tier.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                  } ${loading === tier.id ? 'opacity-50' : ''}`}
                >
                  {loading === tier.id ? 'Processing...' : getButtonText(tier)}
                </button>

                {isCurrent(tier.id) && tier.id !== 'free' && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="mt-2 w-full text-sm text-red-600 hover:text-red-700"
                  >
                    Cancel subscription
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <FAQItem
              question="Can I change my plan at any time?"
              answer="Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades apply at the end of your current billing period."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe."
            />
            <FAQItem
              question="Is there a long-term commitment?"
              answer="No, all plans are billed monthly with no long-term commitment. You can cancel anytime."
            />
            <FAQItem
              question="What happens if I exceed my quota?"
              answer="You'll receive a notification when approaching your limit. You can either upgrade your plan or wait for the monthly reset."
            />
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900">Cancel Subscription</h3>
            <p className="mt-4 text-gray-600">
              Are you sure you want to cancel your subscription? You will retain access until
              the end of your current billing period.
            </p>
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={loading === 'cancel'}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loading === 'cancel'}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                {loading === 'cancel' ? 'Canceling...' : 'Cancel Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-semibold text-gray-900">{question}</h3>
        <svg
          className={`h-5 w-5 transform text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <p className="mt-4 text-gray-600">{answer}</p>}
    </div>
  );
};

export default SubscriptionManager;
