import { format } from "date-fns";

export const DateFormats = {
  DEFAULT: "PPP",
  DATE: "dd/MM/yyyy",
  DATE_TIME: "dd/MM/yyyy HH:mm",
  DATE_TIME_12H: "dd/MM/yyyy hh:mm a",
  MONTH_YEAR: "MMM yyyy",
  MONTH_DATE: "dd MMM",
  FULL_DATE: "EEEE, dd MMMM yyyy",
  ISO: "yyyy-MM-dd",
} as const;

export type DateFormat = (typeof DateFormats)[keyof typeof DateFormats];

export const formatDate = (
  date: Date,
  formatString: DateFormat = DateFormats.DEFAULT,
) => format(date, formatString);
