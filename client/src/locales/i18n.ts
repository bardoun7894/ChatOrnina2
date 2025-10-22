import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your JSON translations
import translationEn from './en/translation.json';
import translationAr from './ar/translation.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'ar',
    fallbackLng: 'ar',
    resources: {
      en: { translation: translationEn },
      ar: { translation: translationAr },
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
