import type { NearbyIncident } from "../api/admin";

// The nearby-search API may not return the *_ar fields yet, so each one falls
// back to its English counterpart when missing.
export const localizeNearbyIncident = (
  item: NearbyIncident,
  isArabic: boolean,
) => ({
  status: isArabic ? item.status_ar || item.status : item.status,
  classificationName: isArabic
    ? item.classification_name_ar || item.classification_name
    : item.classification_name,
  locationName: isArabic
    ? item.location_name_ar || item.location_name
    : item.location_name,
});

// Search matches both languages so typing either finds the incident.
export const matchesNearbySearch = (item: NearbyIncident, q: string) =>
  [
    item.incident_number,
    item.location_name,
    item.location_name_ar,
    item.status,
    item.status_ar,
    item.classification_name,
    item.classification_name_ar,
  ].some((v) => v?.toLowerCase().includes(q));
