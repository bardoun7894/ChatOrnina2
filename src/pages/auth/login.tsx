import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, getSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';

export default function Login() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/home-chat');
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/home-chat');
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl: '/home-chat' });
  };

  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, var(--galileo-bg-gradient-start) 0%, var(--galileo-bg-gradient-end) 100%)'
    }}>
      {/* Animated background elements for Apple-style effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30" style={{
          background: 'var(--galileo-glass-refraction-bg)',
          filter: 'var(--galileo-glass-blur)',
          animation: 'float 20s ease-in-out infinite'
        }}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-30" style={{
          background: 'var(--galileo-glass-refraction-bg)',
          filter: 'var(--galileo-glass-blur)',
          animation: 'float 25s ease-in-out infinite reverse'
        }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20" style={{
          background: 'var(--galileo-glass-refraction-bg)',
          filter: 'blur(60px)',
          animation: 'pulse 10s ease-in-out infinite'
        }}></div>
      </div>
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, var(--galileo-glass-subtle-bg) 0%, var(--galileo-glass-bg) 100%)',
        backdropFilter: 'var(--galileo-glass-blur)'
      }}></div>

      <Head>
        <title>{t('auth.login')} - AI SaaS Platform</title>
        <meta name="description" content="Login to your AI SaaS Platform account" />
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.3; }
          }
        `}</style>
      </Head>

      <div className="max-w-md w-full space-y-8" style={{
        backgroundColor: 'var(--galileo-glass-bg)',
        backdropFilter: 'var(--galileo-glass-blur)',
        border: '1px solid var(--galileo-glass-border)',
        borderRadius: '20px',
        boxShadow: 'var(--galileo-glass-shadow)',
        padding: '2rem'
      }}>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: 'var(--galileo-text-primary)' }}>
            {t('auth.login')}
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--galileo-text-secondary)' }}>
            {t('auth.dontHaveAccount')}{' '}
            <Link href="/auth/register" className="font-medium hover:underline" style={{ color: 'var(--galileo-text-primary)' }}>
              {t('auth.register')}
            </Link>
          </p>
        </div>
        
        <div className="mt-8">
          <div className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md p-4" style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{error}</div>
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium" style={{ color: 'var(--galileo-text-primary)' }}>
                  {t('auth.email')}
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 rounded-md focus:outline-none transition-all duration-250 ease-in-out"
                    style={{
                      backgroundColor: 'var(--galileo-interactive-bg)',
                      backdropFilter: 'var(--galileo-glass-blur)',
                      border: '1px solid var(--galileo-interactive-border)',
                      borderRadius: '20px',
                      boxShadow: 'var(--galileo-glass-shadow)',
                      color: 'var(--galileo-text-primary)',
                      fontSize: '15px',
                      padding: '12px 20px',
                      transition: 'all 0.25s ease'
                    }}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'var(--galileo-text-primary)' }}>
                  {t('auth.password')}
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 rounded-md focus:outline-none transition-all duration-250 ease-in-out"
                    style={{
                      backgroundColor: 'var(--galileo-interactive-bg)',
                      backdropFilter: 'var(--galileo-glass-blur)',
                      border: '1px solid var(--galileo-interactive-border)',
                      borderRadius: '20px',
                      boxShadow: 'var(--galileo-glass-shadow)',
                      color: 'var(--galileo-text-primary)',
                      fontSize: '15px',
                      padding: '12px 20px',
                      transition: 'all 0.25s ease'
                    }}
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/auth/forgot-password" className="font-medium hover:underline" style={{ color: 'var(--galileo-text-primary)' }}>
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 rounded-md focus:outline-none transition-all duration-250 ease-in-out disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--galileo-interactive-bg)',
                    border: '1px solid var(--galileo-interactive-border)',
                    borderRadius: '20px',
                    boxShadow: 'var(--galileo-glass-shadow)',
                    color: 'var(--galileo-text-primary)',
                    fontSize: '15px',
                    padding: '12px 20px',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--galileo-interactive-hover)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--galileo-interactive-bg)';
                  }}
                >
                  {isLoading ? (
                    <span className="loading-spinner mr-2"></span>
                  ) : null}
                  {t('auth.login')}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }} />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2" style={{ 
                    backgroundColor: 'var(--galileo-glass-bg)',
                    color: 'var(--galileo-text-secondary)'
                  }}>Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOAuthSignIn('google')}
                  className="w-full inline-flex justify-center py-3 px-4 rounded-md focus:outline-none transition-all duration-250 ease-in-out"
                  style={{
                    backgroundColor: 'var(--galileo-interactive-bg)',
                    border: '1px solid var(--galileo-interactive-border)',
                    borderRadius: '20px',
                    boxShadow: 'var(--galileo-glass-shadow)',
                    color: 'var(--galileo-text-primary)',
                    fontSize: '15px',
                    padding: '12px 20px',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--galileo-interactive-hover)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--galileo-interactive-bg)';
                  }}
                >
                  <span className="sr-only">{t('auth.loginWithGoogle')}</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>

                <button
                  onClick={() => handleOAuthSignIn('github')}
                  className="w-full inline-flex justify-center py-3 px-4 rounded-md focus:outline-none transition-all duration-250 ease-in-out"
                  style={{
                    backgroundColor: 'var(--galileo-interactive-bg)',
                    border: '1px solid var(--galileo-interactive-border)',
                    borderRadius: '20px',
                    boxShadow: 'var(--galileo-glass-shadow)',
                    color: 'var(--galileo-text-primary)',
                    fontSize: '15px',
                    padding: '12px 20px',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--galileo-interactive-hover)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--galileo-interactive-bg)';
                  }}
                >
                  <span className="sr-only">{t('auth.loginWithGitHub')}</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};



