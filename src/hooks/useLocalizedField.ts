import { useTranslation } from "react-i18next";
import { supportedLanguages } from "../i18n";

/**
 * Returns a function that picks the right localized field from a record.
 *
 * Priority: current-language field → app-default-language field → English field → raw value
 *
 * Usage:
 *   const localize = useLocalizedField();
 *   localize(item, 'name')   // picks item.name_ar when lang=ar, else item.name
 *   localize(item, 'description')
 */
export function useLocalizedField(appDefaultLanguage?: string) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const defaultLang = appDefaultLanguage || "en";

  return function localize<T extends Record<string, unknown>>(
    record: T,
    field: string,
  ): string {
    const langSuffix = (lang: string): string => {
      const def = supportedLanguages.find((l) => l.code === lang);
      if (!def || lang === "en") return "";
      return `_${lang}`;
    };

    // Try current language field (e.g. name_ar)
    const currentKey = field + langSuffix(currentLang);
    if (currentKey !== field) {
      const val = record[currentKey];
      if (typeof val === "string" && val.trim()) return val;
    }

    // Try app default language field
    if (defaultLang !== currentLang) {
      const defaultKey = field + langSuffix(defaultLang);
      if (defaultKey !== field) {
        const val = record[defaultKey];
        if (typeof val === "string" && val.trim()) return val;
      }
    }

    // Fall back to the base English field
    const base = record[field];
    return typeof base === "string" ? base : "";
  };
}
