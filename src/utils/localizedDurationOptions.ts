import type { TFunction } from "i18next";

export function localizeDurationLabel(raw: string, t: TFunction): string {
  // e.g. "1 Day" | "2 Days" | "3 Month" | "1 Year"
  const match = raw.trim().match(/^(\d+)\s*(day|week|month|year)s?$/i);
  if (!match) return raw;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const key = value === 1 ? unit : `${unit}s`;

  return t(`incidents.duration.${key}`, { value, defaultValue: raw });
}
