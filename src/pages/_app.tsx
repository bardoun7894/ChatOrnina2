import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
            {mounted && <Component {...pageProps} />}
          </div>
        </LanguageProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

export default appWithTranslation(App);
