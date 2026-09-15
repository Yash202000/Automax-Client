import type { LookupCategory } from "@/types";
import { getLocalizedName } from "@/lib/utils";

/**
 * Resolve a source code (e.g. "MOBILE", "WEB") to a localized label
 * using the SOURCE lookup category. - master data- Sources
 */
export function resolveSourceLabel(
  source: string | null | undefined,
  sourceData: LookupCategory | null | undefined,
): string {
  if (!source) return "-";

  const needle = source.trim().toLowerCase();
  const match = sourceData?.values?.find(
    (v) => v.code?.toLowerCase() === needle,
  );

  if (!match) return source.replace(/_/g, " ");

  return getLocalizedName(match);
}
