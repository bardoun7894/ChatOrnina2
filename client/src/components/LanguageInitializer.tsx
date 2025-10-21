import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { useGetStartupConfig } from '~/data-provider';

/**
 * Component to initialize the default language from server config
 * This runs once when the app loads and sets the default language
 * if the user hasn't selected one yet
 */
export default function LanguageInitializer() {
  const { data: config } = useGetStartupConfig();

  useEffect(() => {
    if (!config?.interface?.languageSelection) {
      return;
    }

    const { default: defaultLang, enabled } = config.interface.languageSelection;
    
    if (!enabled || !defaultLang) {
      return;
    }
    
    // Check current language settings
    const storedLang = localStorage.getItem('lang');
    const cookieLang = Cookies.get('lang');
    
    // If no language is set, or if it's set to browser default, use server default
    if (!storedLang && !cookieLang) {
      console.log('[LanguageInitializer] Setting default language to:', defaultLang);
      localStorage.setItem('lang', defaultLang);
      Cookies.set('lang', defaultLang, { expires: 365 });
      
      // Use i18next to change language if available
      if ((window as any).i18n) {
        (window as any).i18n.changeLanguage(defaultLang);
      } else {
        // Reload to apply the language
        window.location.reload();
      }
    }
  }, [config]);

  return null;
}
