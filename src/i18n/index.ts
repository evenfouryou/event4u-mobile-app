import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';

import it from './locales/it.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

export const LANGUAGES = [
  { code: 'it', name: 'Italiano', isoCode: 'IT' },
  { code: 'en', name: 'English', isoCode: 'EN' },
  { code: 'fr', name: 'Français', isoCode: 'FR' },
  { code: 'de', name: 'Deutsch', isoCode: 'DE' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

const getDeviceLanguage = (): LanguageCode => {
  try {
    let locale = 'it';
    
    if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
               NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
               'it';
    } else if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager?.localeIdentifier || 'it';
    }
    
    const languageCode = locale.split('_')[0].split('-')[0].toLowerCase();
    
    if (LANGUAGES.some(l => l.code === languageCode)) {
      return languageCode as LanguageCode;
    }
  } catch (error) {
    console.log('[i18n] Error detecting device language:', error);
  }
  
  return 'it';
};

const resources = {
  it: { translation: it },
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'it',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
