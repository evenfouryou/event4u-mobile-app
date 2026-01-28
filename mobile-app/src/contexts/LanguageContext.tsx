import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import i18n, { LANGUAGES, LanguageCode } from '@/i18n';

const LANGUAGE_STORAGE_KEY = 'event4u_language';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  languages: typeof LANGUAGES;
  changeLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: string, options?: object) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(
    (i18nInstance.language as LanguageCode) || 'it'
  );

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && LANGUAGES.some(l => l.code === savedLanguage)) {
          await i18nInstance.changeLanguage(savedLanguage);
          setCurrentLanguage(savedLanguage as LanguageCode);
          console.log('[Language] Loaded saved language:', savedLanguage);
        }
      } catch (error) {
        console.error('[Language] Error loading saved language:', error);
      }
    };

    loadSavedLanguage();
  }, [i18nInstance]);

  const changeLanguage = useCallback(async (code: LanguageCode) => {
    try {
      await i18nInstance.changeLanguage(code);
      setCurrentLanguage(code);
      await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, code);
      console.log('[Language] Changed to:', code);
    } catch (error) {
      console.error('[Language] Error changing language:', error);
    }
  }, [i18nInstance]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        languages: LANGUAGES,
        changeLanguage,
        t: t as (key: string, options?: object) => string,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { LANGUAGES, LanguageCode };
