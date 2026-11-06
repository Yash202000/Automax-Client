export const NAME_REGEX = /^[A-Za-z0-9\s\-'",.&()/]+$/;
export const CODE_REGEX = /^[a-z0-9_-]+$/;
export const ROLE_NAME_REGEX = /^[A-Za-z0-9\s\-&()]+$/;

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateName = (value: string): boolean => {
  return NAME_REGEX.test(value.trim());
};

export const validateCode = (value: string): boolean => {
  return CODE_REGEX.test(value.trim());
};

export const validateRoleName = (value: string): boolean => {
  return ROLE_NAME_REGEX.test(value.trim());
};

//check if two phone number are same
export const isSamePhoneNumber = (a?: string, b?: string): boolean => {
  const digitsA = (a ?? "").replace(/\D/g, "");
  const digitsB = (b ?? "").replace(/\D/g, "");
  return digitsA.length > 0 && digitsA === digitsB;
};

export type MobileNumberIssue = "invalidFormat" | "tooShort" | "tooLong";

// Mirrors the backend rule: 8-15 digits, optionally prefixed with "+"
// (spaces, dashes and parentheses are ignored). Returns null when valid.
export const getMobileNumberIssue = (
  value: string,
): MobileNumberIssue | null => {
  const normalized = value.replace(/[\s\-()]/g, "");
  if (!/^\+?\d*$/.test(normalized)) return "invalidFormat";
  const digits = normalized.replace("+", "").length;
  if (digits < 8) return "tooShort";
  if (digits > 15) return "tooLong";
  return null;
};
