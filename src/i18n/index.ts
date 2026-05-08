import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ar from "./locales/ar.json";

const LANGUAGE_KEY = "app_language";

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

export const supportedLanguages = [
  { code: "en", name: "English", nativeName: "English", rtl: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
];

/** Normalise a BCP-47 tag (e.g. "ar-SA", "ar-EG") to its base code ("ar"). */
const normaliseLocale = (tag: string): string => {
  const base = tag.split("-")[0].toLowerCase();
  return supportedLanguages.find((l) => l.code === base) ? base : "en";
};

// Get stored language
export const getStoredLanguage = (): string => {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored) return stored;
  // Derive from browser navigator and normalise regional tags
  const nav =
    navigator.language ||
    (navigator.languages && navigator.languages[0]) ||
    "en";
  return normaliseLocale(nav);
};

// Save language preference and update document direction
export const setLanguage = async (lang: string): Promise<void> => {
  localStorage.setItem(LANGUAGE_KEY, lang);
  const langDef = supportedLanguages.find((l) => l.code === lang);
  document.documentElement.dir = langDef?.rtl ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  await i18n.changeLanguage(lang);
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || getStoredLanguage();
};

// Check if current language is RTL
export const isRTL = (): boolean => {
  const lang = getCurrentLanguage();
  return supportedLanguages.find((l) => l.code === lang)?.rtl ?? false;
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_KEY,
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) => normaliseLocale(lng),
    },
    react: {
      useSuspense: false,
    },
  });

// Set initial document direction based on stored language
const initialLang = getStoredLanguage();
const initialLangDef = supportedLanguages.find((l) => l.code === initialLang);
document.documentElement.dir = initialLangDef?.rtl ? "rtl" : "ltr";
document.documentElement.lang = initialLang;

export default i18n;
