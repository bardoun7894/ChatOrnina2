import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEn from './en/translation.json';
import translationAr from './ar/translation.json';

export const defaultNS = 'translation';

export const resources = {
  en: { translation: translationEn },
  ar: { translation: translationAr },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      default: ['ar'], // Default to Arabic as specified in librechat.yaml
    },
    fallbackNS: 'translation',
    ns: ['translation'],
    debug: false,
    defaultNS,
    resources,
    interpolation: { escapeValue: false },
  });

export default i18n;
