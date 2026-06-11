// i18n bootstrap — imported once from main.tsx (side effect).
// Language resolution: explicit user choice (localStorage) → browser language
// → German. The profile screen's language switcher calls i18n.changeLanguage,
// which the detector persists back to localStorage.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import de from "./locales/de.json";
import en from "./locales/en.json";

export const SUPPORTED_LOCALES = ["de", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    fallbackLng: "de",
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: true, // "en-US" → "en"
    interpolation: { escapeValue: false }, // React escapes already
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "comatch.lang",
    },
  });

/** The app's current two-letter locale. */
export function currentLocale(): Locale {
  return i18n.language?.startsWith("en") ? "en" : "de";
}

export default i18n;
