// Maps a KPI's configured reporting frequency to the period type its
// targets/actuals are expected to use, mirroring the backend's
// services.ValidatePeriod mapping.
export const periodTypeForFrequency: Record<string, string> = {
  monthly: "month",
  quarterly: "quarter",
  annually: "annual",
};

export const periodKeyPlaceholder: Record<string, string> = {
  month: "2026-03",
  quarter: "2026-Q1",
  semi_annual: "2026-H1",
  custom: "e.g. 2026-Ramadan",
};
