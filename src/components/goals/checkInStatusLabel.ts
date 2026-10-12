import type { TFunction } from "i18next";

// Check-in statuses are snake_case values from the API ("on_track",
// "at_risk", "behind", "blocked") while their translations live under
// camelCase keys (goals.components.badges.checkIn.onTrack / atRisk / …).
// Building the key straight from the value only worked for the one-word
// statuses, so the others showed the raw resource key.
export function checkInStatusLabel(t: TFunction, status: string): string {
  const key = status.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return t(`goals.components.badges.checkIn.${key}`, {
    defaultValue: status,
  });
}
