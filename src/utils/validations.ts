export const NAME_REGEX = /^[A-Za-z0-9\s\-'",.&()/]+$/;
export const CODE_REGEX = /^[a-z0-9_-]+$/;

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateName = (value: string): boolean => {
  return NAME_REGEX.test(value.trim());
};

export const validateCode = (value: string): boolean => {
  return CODE_REGEX.test(value.trim());
};
