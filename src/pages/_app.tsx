import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
// Import Crayon UI CSS for Thesys C1 components
import '@crayonai/react-ui/styles/index.css';
import '../styles/globals.css';

function AppContent({ Component, pageProps, router }: AppProps) {
  const { isRTL } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
      </Head>
      <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning dir={isRTL ? 'rtl' : 'ltr'}>
        {mounted && <Component {...pageProps} />}
      </div>
    </>
  );
}

function App({ Component, pageProps, router }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  // Handle chunk load errors by reloading the page once
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      // Check if it's a chunk load error
      if (
        event.message?.includes('ChunkLoadError') ||
        event.message?.includes('Loading chunk') ||
        event.error?.name === 'ChunkLoadError'
      ) {
        console.warn('[App] Chunk load error detected, reloading page...');
        
        // Check if we've already reloaded recently (prevent infinite loops)
        const lastReload = sessionStorage.getItem('lastChunkErrorReload');
        const now = Date.now();
        
        if (!lastReload || now - parseInt(lastReload) > 10000) {
          // Only reload if it's been more than 10 seconds since last reload
          sessionStorage.setItem('lastChunkErrorReload', now.toString());
          window.location.reload();
        } else {
          console.error('[App] Multiple chunk errors, please clear cache and reload manually');
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    
    // Also handle unhandled promise rejections for dynamic imports
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes('ChunkLoadError') ||
        event.reason?.message?.includes('Loading chunk')
      ) {
        console.warn('[App] Chunk load error in promise, reloading page...');
        
        const lastReload = sessionStorage.getItem('lastChunkErrorReload');
        const now = Date.now();
        
        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem('lastChunkErrorReload', now.toString());
          window.location.reload();
        }
      }
    };
    
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AppContent Component={Component} pageProps={pageProps} router={router} />
        </LanguageProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

export default appWithTranslation(App);
