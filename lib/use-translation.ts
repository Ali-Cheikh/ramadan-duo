import { useLanguage } from './language-context';
import { translations, Language } from './translations';

export const useTranslation = () => {
  const { language } = useLanguage();
  
  const t = (key: string): string => {
    try {
      const keys = key.split('.');
      let value: any = translations[language];
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      return value || key;
    } catch (error) {
      console.error('Translation error:', error, key);
      return key;
    }
  };

  return { t, language };
};
