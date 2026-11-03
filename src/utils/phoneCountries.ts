// Country dialing metadata used by PhoneNumberInput. `pattern` validates the
// national significant number (no country code, no trunk "0", digits only);
// `example` is shown as the input placeholder for that country.
export interface PhoneCountry {
  iso2: string;
  name: string;
  dialCode: string;
  pattern: RegExp;
  example: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  // GCC
  {
    iso2: "SA",
    name: "Saudi Arabia",
    dialCode: "966",
    pattern: /^(5\d{8}|1\d{7})$/,
    example: "50 123 4567",
  },
  {
    iso2: "AE",
    name: "United Arab Emirates",
    dialCode: "971",
    pattern: /^(5\d{8}|[2-79]\d{7})$/,
    example: "50 123 4567",
  },
  {
    iso2: "KW",
    name: "Kuwait",
    dialCode: "965",
    pattern: /^[124569]\d{7}$/,
    example: "5012 3456",
  },
  {
    iso2: "QA",
    name: "Qatar",
    dialCode: "974",
    pattern: /^[3-7]\d{7}$/,
    example: "3312 3456",
  },
  {
    iso2: "BH",
    name: "Bahrain",
    dialCode: "973",
    pattern: /^[136-9]\d{7}$/,
    example: "3600 1234",
  },
  {
    iso2: "OM",
    name: "Oman",
    dialCode: "968",
    pattern: /^[279]\d{7}$/,
    example: "9212 3456",
  },
  // Middle East & Africa
  {
    iso2: "EG",
    name: "Egypt",
    dialCode: "20",
    pattern: /^(1[0125]\d{8}|[2-9]\d{7,8})$/,
    example: "100 123 4567",
  },
  {
    iso2: "JO",
    name: "Jordan",
    dialCode: "962",
    pattern: /^(7[789]\d{7}|[2-6]\d{7})$/,
    example: "79 012 3456",
  },
  {
    iso2: "LB",
    name: "Lebanon",
    dialCode: "961",
    pattern: /^[1-9]\d{6,7}$/,
    example: "71 123 456",
  },
  {
    iso2: "SY",
    name: "Syria",
    dialCode: "963",
    pattern: /^(9\d{8}|[1-5]\d{6,8})$/,
    example: "944 567 890",
  },
  {
    iso2: "IQ",
    name: "Iraq",
    dialCode: "964",
    pattern: /^(7\d{9}|[1-6]\d{7,8})$/,
    example: "791 234 5678",
  },
  {
    iso2: "YE",
    name: "Yemen",
    dialCode: "967",
    pattern: /^(7\d{8}|[1-6]\d{6,7})$/,
    example: "712 345 678",
  },
  {
    iso2: "PS",
    name: "Palestine",
    dialCode: "970",
    pattern: /^(5[69]\d{7}|[2489]\d{7})$/,
    example: "599 123 456",
  },
  {
    iso2: "SD",
    name: "Sudan",
    dialCode: "249",
    pattern: /^[19]\d{8}$/,
    example: "91 123 1234",
  },
  {
    iso2: "TR",
    name: "Turkey",
    dialCode: "90",
    pattern: /^[2-5]\d{9}$/,
    example: "501 234 5678",
  },
  // Asia
  {
    iso2: "IN",
    name: "India",
    dialCode: "91",
    pattern: /^[1-9]\d{9}$/,
    example: "81234 56789",
  },
  {
    iso2: "PK",
    name: "Pakistan",
    dialCode: "92",
    pattern: /^(3\d{9}|[2-9]\d{7,9})$/,
    example: "301 2345678",
  },
  {
    iso2: "BD",
    name: "Bangladesh",
    dialCode: "880",
    pattern: /^(1[3-9]\d{8}|[2-9]\d{6,9})$/,
    example: "1812 345678",
  },
  {
    iso2: "PH",
    name: "Philippines",
    dialCode: "63",
    pattern: /^(9\d{9}|[2-8]\d{7,8})$/,
    example: "905 123 4567",
  },
  {
    iso2: "ID",
    name: "Indonesia",
    dialCode: "62",
    pattern: /^(8\d{8,11}|[2-7]\d{6,10})$/,
    example: "812 345 678",
  },
];

export const DEFAULT_PHONE_COUNTRY = "SA";

// Longest dial code first so "+966…" never matches a shorter code by accident
const BY_DIAL_CODE_LENGTH = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
);

export const getPhoneCountry = (iso2?: string): PhoneCountry =>
  PHONE_COUNTRIES.find((c) => c.iso2 === iso2) ??
  PHONE_COUNTRIES.find((c) => c.iso2 === DEFAULT_PHONE_COUNTRY)!;

// Localized country name (e.g. "المملكة العربية السعودية" for "ar"),
// falling back to the English name when Intl.DisplayNames is unavailable
export const getPhoneCountryName = (
  country: PhoneCountry,
  language: string,
): string => {
  try {
    return (
      new Intl.DisplayNames([language], { type: "region" }).of(country.iso2) ||
      country.name
    );
  } catch {
    return country.name;
  }
};

// National number as stored: digits only, without the trunk "0"
export const toNationalDigits = (value: string): string =>
  value.replace(/\D/g, "").replace(/^0+/, "");

export interface ParsedPhoneNumber {
  country: PhoneCountry;
  national: string;
}

// Splits a stored/prefilled number into country + national part. Handles
// "+966501234567", "00966501234567", "966501234567" and local "0501234567"
// (the last two fall back to `fallbackIso2`).
export const parsePhoneNumber = (
  value: string | undefined,
  fallbackIso2: string = DEFAULT_PHONE_COUNTRY,
): ParsedPhoneNumber => {
  const fallback = getPhoneCountry(fallbackIso2);
  const raw = (value ?? "").trim();
  if (!raw) return { country: fallback, national: "" };

  const digits = raw.replace(/\D/g, "");
  const international = raw.startsWith("+") || raw.startsWith("00");
  if (international) {
    const intlDigits = raw.startsWith("00") ? digits.slice(2) : digits;
    const country = BY_DIAL_CODE_LENGTH.find((c) =>
      intlDigits.startsWith(c.dialCode),
    );
    if (country) {
      return {
        country,
        national: toNationalDigits(intlDigits.slice(country.dialCode.length)),
      };
    }
    return { country: fallback, national: toNationalDigits(intlDigits) };
  }

  // Bare digits that already carry the fallback country's code (common for
  // CTI caller IDs, e.g. "966501234567")
  if (digits.startsWith(fallback.dialCode)) {
    const rest = toNationalDigits(digits.slice(fallback.dialCode.length));
    if (fallback.pattern.test(rest))
      return { country: fallback, national: rest };
  }
  return { country: fallback, national: toNationalDigits(digits) };
};

// Canonical form sent to the API, e.g. "+966501234567"; "" when empty
export const formatPhoneNumber = (country: PhoneCountry, national: string) =>
  national ? `+${country.dialCode}${national}` : "";

export const normalizePhoneNumber = (
  value: string | undefined,
  fallbackIso2?: string,
): string => {
  const { country, national } = parsePhoneNumber(value, fallbackIso2);
  return formatPhoneNumber(country, national);
};

// Returns the country the number was validated against when it doesn't match
// that country's format, or null when valid/empty
export const getPhoneNumberCountryIssue = (
  value: string | undefined,
  fallbackIso2?: string,
): PhoneCountry | null => {
  const { country, national } = parsePhoneNumber(value, fallbackIso2);
  if (!national) return null;
  return country.pattern.test(national) ? null : country;
};
