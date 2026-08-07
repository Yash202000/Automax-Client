export type BandColor = "green" | "amber" | "red";

export interface BandThresholds {
  green_min: number;
  amber_min: number;
}

export function getBandColor(
  achievementPct: number,
  band?: BandThresholds,
): BandColor {
  const greenMin = band?.green_min ?? 80;
  const amberMin = band?.amber_min ?? 60;
  if (achievementPct >= greenMin) return "green";
  if (achievementPct >= amberMin) return "amber";
  return "red";
}

export const BAND_BAR_CLASS: Record<BandColor, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const BAND_TEXT_CLASS: Record<BandColor, string> = {
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
};
