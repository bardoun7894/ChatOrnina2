import React, { useState, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import store from '~/store';

/**
 * User Dashboard Component
 * Unified interface for all AI tools and user services
 * Displays usage statistics, subscription info, and quick access to AI features
 */

interface UsageStats {
  messages: number;
  images: number;
  videos: number;
  codeGenerations: number;
  designAnalyses: number;
  lastReset?: Date;
}

interface SubscriptionInfo {
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive';
  startDate?: Date;
  endDate?: Date;
}

interface UserDashboardData {
  usage: UsageStats;
  quota: UsageStats;
  subscription: SubscriptionInfo;
}

const UserDashboard: React.FC = () => {
  const user = useRecoilValue(store.user);
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/dashboard', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateUsagePercentage = (used: number, quota: number): number => {
    if (quota === -1) return 0; // Unlimited
    if (quota === 0) return 100;
    return Math.min((used / quota) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTierDisplayName = (tier: string): string => {
    const tierNames = {
      free: 'Free',
      basic: 'Basic',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return tierNames[tier as keyof typeof tierNames] || tier;
  };

  const getTierBadgeColor = (tier: string): string => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-amber-100 text-amber-800',
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { usage, quota, subscription } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.name || 'User'}!</p>
        </div>

        {/* Subscription Card */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${getTierBadgeColor(subscription.tier)}`}
                >
                  {getTierDisplayName(subscription.tier)}
                </span>
                <span className="text-sm text-gray-500">
                  {subscription.status === 'active' ? '✓ Active' : `Status: ${subscription.status}`}
                </span>
              </div>
            </div>
            {subscription.tier !== 'enterprise' && (
              <button className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
                Upgrade Plan
              </button>
            )}
          </div>
          {subscription.endDate && (
            <p className="mt-4 text-sm text-gray-600">
              {subscription.status === 'active' ? 'Renews' : 'Ends'} on{' '}
              {new Date(subscription.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Usage Statistics Grid */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Usage This Month</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Messages Usage */}
            <UsageCard
              title="Messages"
              icon="💬"
              used={usage.messages}
              quota={quota.messages}
              percentage={calculateUsagePercentage(usage.messages, quota.messages)}
              color={getUsageColor(calculateUsagePercentage(usage.messages, quota.messages))}
            />

            {/* Images Usage */}
            <UsageCard
              title="Images"
              icon="🖼️"
              used={usage.images}
              quota={quota.images}
              percentage={calculateUsagePercentage(usage.images, quota.images)}
              color={getUsageColor(calculateUsagePercentage(usage.images, quota.images))}
            />

            {/* Videos Usage */}
            <UsageCard
              title="Videos"
              icon="🎥"
              used={usage.videos}
              quota={quota.videos}
              percentage={calculateUsagePercentage(usage.videos, quota.videos)}
              color={getUsageColor(calculateUsagePercentage(usage.videos, quota.videos))}
            />

            {/* Code Generations */}
            <UsageCard
              title="Code Generations"
              icon="💻"
              used={usage.codeGenerations}
              quota={quota.codeGenerations}
              percentage={calculateUsagePercentage(usage.codeGenerations, quota.codeGenerations)}
              color={getUsageColor(
                calculateUsagePercentage(usage.codeGenerations, quota.codeGenerations),
              )}
            />

            {/* Design Analyses */}
            <UsageCard
              title="Design Analyses"
              icon="🎨"
              used={usage.designAnalyses}
              quota={quota.designAnalyses}
              percentage={calculateUsagePercentage(usage.designAnalyses, quota.designAnalyses)}
              color={getUsageColor(
                calculateUsagePercentage(usage.designAnalyses, quota.designAnalyses),
              )}
            />
          </div>
          {usage.lastReset && (
            <p className="mt-4 text-sm text-gray-500">
              Usage resets on {new Date(usage.lastReset).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="New Chat"
              icon="💬"
              description="Start a conversation"
              href="/chat"
            />
            <QuickActionCard
              title="Generate Code"
              icon="💻"
              description="Create code snippets"
              href="/code"
            />
            <QuickActionCard
              title="Analyze Design"
              icon="🎨"
              description="Get design feedback"
              href="/design"
            />
            <QuickActionCard
              title="Create Video"
              icon="🎥"
              description="Generate AI videos"
              href="/video"
            />
          </div>
        </div>

        {/* Recent Activity (Placeholder) */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Activity</h2>
          <div className="text-center text-gray-500">
            <p>Recent activity will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface UsageCardProps {
  title: string;
  icon: string;
  used: number;
  quota: number;
  percentage: number;
  color: string;
}

const UsageCard: React.FC<UsageCardProps> = ({ title, icon, used, quota, percentage, color }) => {
  const isUnlimited = quota === -1;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900">{used}</p>
        <p className="text-sm text-gray-600">
          {isUnlimited ? 'Unlimited' : `of ${quota} used`}
        </p>
      </div>
      {!isUnlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
        </div>
      )}
    </div>
  );
};

interface QuickActionCardProps {
  title: string;
  icon: string;
  description: string;
  href: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, icon, description, href }) => {
  return (
    <a
      href={href}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md"
    >
      <div className="mb-2 text-3xl">{icon}</div>
      <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
};

export default UserDashboard;
