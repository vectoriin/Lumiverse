import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { I18N_NAMESPACES, resources } from './resources'

export const UI_LANGUAGE_STORAGE_KEY = 'lumiverse-ui-language'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    defaultNS: 'common',
    ns: [...I18N_NAMESPACES],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: UI_LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

export default i18n
