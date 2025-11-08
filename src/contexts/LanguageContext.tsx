import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import enTranslations from '../locales/en/common.json';
import arTranslations from '../locales/ar/common.json';

// Define supported languages
export type Language = 'en' | 'ar';

// Define translation type
export type Translations = {
  [key in Language]: {
    [key: string]: any;
  };
};

// Translation data
const translations: Translations = {
  en: enTranslations,
  ar: arTranslations
};

// Language context type
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  tWithParams: (key: string, params: Record<string, any>) => string;
  isRTL: boolean;
}

// Create context
const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => key,
  tWithParams: (key: string, params: Record<string, any>) => key,
  isRTL: true
});

// Language provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get saved language from localStorage or default to Arabic
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      return savedLanguage || 'ar';
    }
    return 'ar';
  });

  // Load language from backend on mount (only if authenticated)
  useEffect(() => {
    const loadUserPreferences = async () => {
      // Skip API call on public pages to avoid 401 noise in console
      if (typeof window !== 'undefined' && (
        window.location.pathname === '/' ||
        window.location.pathname.startsWith('/auth/') ||
        window.location.pathname === '/auth/login' ||
        window.location.pathname === '/auth/register'
      )) {
        return; // Use localStorage only on public/auth pages
      }

      // Check if NextAuth session exists before calling API
      // This prevents 401 errors in console on initial page load
      if (typeof window !== 'undefined') {
        // Check for NextAuth session cookie
        const hasSessionCookie = document.cookie.includes('next-auth.session-token') ||
                                 document.cookie.includes('__Secure-next-auth.session-token');

        if (!hasSessionCookie) {
          // No session cookie, user not authenticated - use localStorage only
          return;
        }
      }

      try {
        const response = await fetch('/api/user/preferences');
        // Only process if authenticated (200), silently ignore 401
        if (response.ok) {
          const data = await response.json();
          if (data.preferences?.language) {
            setLanguageState(data.preferences.language as Language);
            if (typeof window !== 'undefined') {
              localStorage.setItem('language', data.preferences.language);
            }
          }
        } else if (response.status === 401) {
          // User not authenticated, use localStorage only
          // This is expected behavior on public pages
          return;
        }
      } catch (error) {
        // Network error or other issue - silently continue with localStorage
        return;
      }
    };
    loadUserPreferences();
  }, []);

  // Set language and save to both localStorage and backend
  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }

    // Skip API call on public pages to avoid 401 noise
    if (typeof window !== 'undefined' && (
      window.location.pathname === '/' ||
      window.location.pathname.startsWith('/auth/') ||
      window.location.pathname === '/auth/login' ||
      window.location.pathname === '/auth/register'
    )) {
      return; // localStorage is enough on public/auth pages
    }

    // Check if NextAuth session exists before calling API
    if (typeof window !== 'undefined') {
      const hasSessionCookie = document.cookie.includes('next-auth.session-token') ||
                               document.cookie.includes('__Secure-next-auth.session-token');
      if (!hasSessionCookie) {
        return; // No session, skip backend sync
      }
    }

    // Save to backend (only if authenticated)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
      // Silently ignore 401 - user not logged in, localStorage is enough
      if (!response.ok && response.status !== 401) {
        console.error('Error saving language preference:', response.statusText);
      }
    } catch (error) {
      // Network error - silently continue, localStorage was already updated
      return;
    }
  };

  // Translation function
  const t = (key: string, fallback?: string): string => {
    // Handle nested keys like 'navigation.logout' or 'homechat.placeholder'
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : fallback || key;
  };

  // Translation function with parameters
  const tWithParams = (key: string, params: Record<string, any> = {}): string => {
    let translation = translations[language][key] || key;
    
    // Replace {{param}} placeholders with actual values
    Object.keys(params).forEach(param => {
      const regex = new RegExp(`{{${param}}}`, 'g');
      translation = translation.replace(regex, params[param]);
    });
    
    return translation;
  };

  // Check if current language is RTL
  const isRTL = language === 'ar';

  // Update document direction when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tWithParams, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Export translations for use in other components
export { translations };