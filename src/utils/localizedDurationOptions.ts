import { useTranslation } from "react-i18next";

export function useLocalizeDurationLabel() {
  const { t } = useTranslation();

  return (raw: string): string => {
    // eg    "1 Day" | "2 Week" | "3 Month" | "1 Year"
    const match = raw.trim().match(/^(\d+)\s+(day|week|month|year)s?$/i);
    if (!match) return raw;

    const [, count, unit] = match;
    console.log("count, unit", count, unit);
    return `${count} ${t(`incidents.duration.${unit.toLowerCase()}`)}`;
  };
}
