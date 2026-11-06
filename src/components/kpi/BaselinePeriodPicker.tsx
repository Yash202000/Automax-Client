import { useState } from "react";
import { Select } from "../ui/Input";

interface Props {
  label: string;
  // "YYYY-MM", or "" when no period is set.
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Month + Year dropdowns for a Baseline Period. Used instead of
// <input type="month">, which Firefox/Safari render as a free-text box.
// Emits "YYYY-MM" once both parts are picked, "" otherwise.
export function BaselinePeriodPicker({
  label,
  value,
  onChange,
  disabled,
  hint,
}: Props) {
  // Holds a half-picked period (month without year or vice versa) until the
  // other part is chosen; a complete value always comes from `value`.
  const [partial, setPartial] = useState({ month: "", year: "" });
  const [valueYear, valueMonth] = value ? value.split("-") : ["", ""];
  const month = value ? valueMonth : partial.month;
  const year = value ? valueYear : partial.year;

  const update = (next: { month: string; year: string }) => {
    if (next.month && next.year) {
      setPartial({ month: "", year: "" });
      onChange(`${next.year}-${next.month}`);
    } else {
      setPartial(next);
      onChange("");
    }
  };

  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear + 1; y >= currentYear - 15; y--) {
    years.push(String(y));
  }
  if (year && !years.includes(year)) years.push(year);

  return (
    <div className="w-full">
      <span className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
        {label}
      </span>
      <div className="grid grid-cols-2 gap-2">
        <Select
          aria-label={`${label} month`}
          value={month}
          disabled={disabled}
          onChange={(e) => update({ month: e.target.value, year })}
          options={[
            { value: "", label: "Month" },
            ...MONTHS.map((m, i) => ({
              value: String(i + 1).padStart(2, "0"),
              label: m,
            })),
          ]}
        />
        <Select
          aria-label={`${label} year`}
          value={year}
          disabled={disabled}
          onChange={(e) => update({ month, year: e.target.value })}
          options={[
            { value: "", label: "Year" },
            ...years.map((y) => ({ value: y, label: y })),
          ]}
        />
      </div>
      {hint && (
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {hint}
        </p>
      )}
    </div>
  );
}
