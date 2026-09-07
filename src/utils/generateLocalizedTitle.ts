import { getLocalizedName } from "@/lib/utils";
import { t } from "i18next";

//generate localized title based on classification and location
export interface RecordTitleData {
  classification?: {
    name?: string;
    name_ar?: string;
  } | null;

  location?: {
    name?: string;
    name_ar?: string;
  } | null;

  city?: string | null;
  address?: string | null;
}

export function generateRecordTitle(data: RecordTitleData): string {
  const parts: string[] = [];

  const classificationName = getLocalizedName(data.classification);
  let locationName = getLocalizedName(data.location);
  //for incidents default location
  if (locationName === "Default") {
    // locationName = t("common.default", "Default");
    locationName = t("incidents.defaultLocation", "Default location");
  }

  if (classificationName) {
    parts.push(classificationName);
  }

  if (locationName) {
    parts.push(locationName);
  }

  if (data.city) {
    parts.push(data.city);
  } else if (data.address) {
    parts.push(data.address);
  }

  return parts.join(" - ");
}
