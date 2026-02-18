'use client';

import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  try {
    const { language, setLanguage } = useLanguage();

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        className="text-xs md:text-sm"
        title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
      >
        <Globe className="w-4 h-4 mr-1" />
        {language === 'en' ? 'العربية' : 'English'}
      </Button>
    );
  } catch (error) {
    // Fallback if not inside LanguageProvider
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs md:text-sm"
        disabled
      >
        <Globe className="w-4 h-4 mr-1" />
        Language
      </Button>
    );
  }
}
