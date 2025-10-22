import { useTranslation } from 'react-i18next';

export default function useLocalize() {
  const { t } = useTranslation();

  return (phraseKey: string, options?: any) => {
    try {
      return t(phraseKey, options);
    } catch (error) {
      console.error('Error in translation:', error);
      return phraseKey; // Fallback to phrase key
    }
  };
}
