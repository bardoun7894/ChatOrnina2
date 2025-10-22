import { useEffect } from 'react';

/**
 * Component to initialize the default language from server config
 * This runs once when the app loads and sets the default language
 * if the user hasn't selected one yet
 */
export default function LanguageInitializer() {
  useEffect(() => {
    // Set default language to Arabic
    localStorage.setItem('lang', 'ar');
    
    // Use i18next to change language if available
    if ((window as any).i18n) {
      (window as any).i18n.changeLanguage('ar');
    }
  }, []);

  return null;
}
