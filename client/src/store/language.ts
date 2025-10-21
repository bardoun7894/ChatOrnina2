import Cookies from 'js-cookie';
import { atomWithLocalStorage } from './utils';

const defaultLang = () => {
  // Check localStorage first for user preference
  const storedLang = localStorage.getItem('lang');
  if (storedLang) {
    return storedLang;
  }
  
  // Check cookie
  const cookieLang = Cookies.get('lang');
  if (cookieLang) {
    return cookieLang;
  }
  
  // Check if config has default language (will be set by startup config)
  const configLang = (window as any).__LIBRECHAT_DEFAULT_LANG__;
  if (configLang) {
    return configLang;
  }
  
  // Fall back to browser language
  return navigator.language || navigator.languages[0];
};

const lang = atomWithLocalStorage('lang', defaultLang());

export default { lang };
