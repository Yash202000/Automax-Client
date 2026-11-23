// Nazaha client (CLIENT=NAZAHA): settings and lists for the Nazaha
// create-incident screen and the reporter details on the incident page.
export const isNazahaClient =
  window.APP_CONFIG?.CLIENT === "NAZAHA" ||
  import.meta.env.VITE_CLIENT === "NAZAHA";

// Maximum length of the "Content" field (5.1).
export const INCIDENT_CONTENT_MAX_LENGTH =
  Number(
    window.APP_CONFIG?.INCIDENT_CONTENT_MAX_LENGTH ||
      import.meta.env.VITE_INCIDENT_CONTENT_MAX_LENGTH,
  ) || 300;

// Whether the operator can type the caller number (1.2). When false it is
// filled only from the call.
export const INCIDENT_CALLER_NUMBER_EDITABLE =
  (window.APP_CONFIG?.INCIDENT_CALLER_NUMBER_EDITABLE ??
    import.meta.env.VITE_INCIDENT_CALLER_NUMBER_EDITABLE ??
    "true") !== "false";

export const NAZAHA_GENDERS = ["male", "female"] as const;

// Lookup category behind the Concerned Authority field (2.4). It has its own
// field, so it is never offered as a generic lookup field as well.
export const CONCERNED_AUTHORITY_CATEGORY = "AUTHORITY";

// Lookup category behind the reporter Nationality field (4.2), same as above.
export const NATIONALITY_CATEGORY = "NATIONALITY";

// Master-data lists that have their own Nazaha field.
export const NAZAHA_LOOKUP_CATEGORIES = [
  CONCERNED_AUTHORITY_CATEGORY,
  NATIONALITY_CATEGORY,
];
