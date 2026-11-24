// Nazaha settings and constants.
export const isNazahaClient =
  window.APP_CONFIG?.CLIENT === "NAZAHA" ||
  import.meta.env.VITE_CLIENT === "NAZAHA";

// Maximum length of the Content field.
export const INCIDENT_CONTENT_MAX_LENGTH =
  Number(
    window.APP_CONFIG?.INCIDENT_CONTENT_MAX_LENGTH ||
      import.meta.env.VITE_INCIDENT_CONTENT_MAX_LENGTH,
  ) || 300;

// Whether the caller number can be typed (else it comes from the call).
export const INCIDENT_CALLER_NUMBER_EDITABLE =
  (window.APP_CONFIG?.INCIDENT_CALLER_NUMBER_EDITABLE ??
    import.meta.env.VITE_INCIDENT_CALLER_NUMBER_EDITABLE ??
    "true") !== "false";

export const NAZAHA_GENDERS = ["male", "female"] as const;

// Lookup list for the Concerned Authority field.
export const CONCERNED_AUTHORITY_CATEGORY = "AUTHORITY";

// Lookup list for the Nationality field.
export const NATIONALITY_CATEGORY = "NATIONALITY";

// Lookup lists with their own Nazaha field (not shown as generic lookups).
export const NAZAHA_LOOKUP_CATEGORIES = [
  CONCERNED_AUTHORITY_CATEGORY,
  NATIONALITY_CATEGORY,
];
