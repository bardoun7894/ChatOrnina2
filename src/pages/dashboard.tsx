import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

interface DashboardStats {
  totalChats: number;
  totalImages: number;
  totalVideos: number;
  subscriptionStatus: 'active' | 'inactive';
  plan: 'free' | 'pro' | 'enterprise';
}

const Dashboard = () => {
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalChats: 0,
    totalImages: 0,
    totalVideos: 0,
    subscriptionStatus: 'inactive',
    plan: 'free',
  });
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    router.push('/auth/login');
    return null;
  }

  useEffect(() => {
    // Mock data - in a real app, this would come from an API
    const mockStats: DashboardStats = {
      totalChats: 42,
      totalImages: 15,
      totalVideos: 8,
      subscriptionStatus: 'active',
      plan: 'pro',
    };

    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-600';
      case 'pro':
        return 'bg-blue-600';
      case 'enterprise':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-600' : 'bg-red-600';
  };

  const StatCard = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) => (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-green-500">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>{t('dashboard.title')} | AI Platform</title>
        <meta name="description" content="User dashboard for AI Platform" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {t('dashboard.welcome')}, {session?.user?.name}!
            </h1>
            <p className="text-gray-300">
              {t('dashboard.manageYourAccount')}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  title={t('dashboard.totalChats')}
                  value={stats.totalChats}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8c0 .747-.082 1.47-.234 2.164l1.396 3.72L21 12z" />
                    </svg>
                  }
                />
                <StatCard
                  title={t('dashboard.totalImages')}
                  value={stats.totalImages}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                />
                <StatCard
                  title={t('dashboard.totalVideos')}
                  value={stats.totalVideos}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  }
                />
              </div>

              {/* Subscription Status */}
              <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('dashboard.subscriptionStatus')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">{t('dashboard.currentPlan')}</p>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(stats.plan)}`}>
                        {stats.plan.charAt(0).toUpperCase() + stats.plan.slice(1)}
                      </span>
                      <button className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors">
                        {t('dashboard.upgradePlan')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">{t('dashboard.status')}</p>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stats.subscriptionStatus)}`}>
                        {stats.subscriptionStatus === 'active' ? t('dashboard.active') : t('dashboard.inactive')}
                      </span>
                      {stats.subscriptionStatus === 'active' && (
                        <button className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors">
                          {t('dashboard.cancelSubscription')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <a
                    href="/chat"
                    className="flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-8 h-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8c0 .747-.082 1.47-.234 2.164l1.396 3.72L21 12z" />
                    </svg>
                    <span className="text-sm">{t('nav.chat')}</span>
                  </a>
                  <a
                    href="/image-generator"
                    className="flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-8 h-8 mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">{t('nav.imageGenerator')}</span>
                  </a>
                  <a
                    href="/video-generator"
                    className="flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-8 h-8 mb-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">{t('nav.videoGenerator')}</span>
                  </a>
                  <a
                    href="/code-generator"
                    className="flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-8 h-8 mb-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4m6-10a4 4 0 00-8 0 4 4 0 008 0zm-8 6a4 4 0 100-8 4 4 0 000 8z" />
                    </svg>
                    <span className="text-sm">{t('nav.codeGenerator')}</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};

export default Dashboard;

