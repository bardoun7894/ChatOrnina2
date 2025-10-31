import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';

export default function Register() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Call the registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show more detailed error message
        if (data.error) {
          setError(`${data.message}: ${data.error}`);
        } else {
          setError(data.message || 'An error occurred during registration');
        }
        setIsLoading(false);
        return;
      }

      // Redirect to login page
      router.push('/auth/login?message=Registration successful');
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
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
        <title>{t('auth.register')} - AI SaaS Platform</title>
        <meta name="description" content="Register for a new AI SaaS Platform account" />
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
            {t('auth.register')}
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--galileo-text-secondary)' }}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/auth/login" className="font-medium hover:underline" style={{ color: 'var(--galileo-text-primary)' }}>
              {t('auth.login')}
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
                  <div className="text-sm" style={{ color: 'var(--galileo-text-primary)' }}>{error}</div>
                </div>
              )}
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium" style={{ color: 'var(--galileo-text-primary)' }}>
                  Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    placeholder="Enter your name"
                  />
                </div>
              </div>

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
                    autoComplete="new-password"
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

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{ color: 'var(--galileo-text-primary)' }}>
                  {t('auth.confirmPassword')}
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    placeholder="Confirm your password"
                  />
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
                  {t('auth.signUp')}
                </button>
              </div>
            </form>
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



