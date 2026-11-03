import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/ui/command";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  formatPhoneNumber,
  getPhoneCountry,
  getPhoneCountryName,
  parsePhoneNumber,
  toNationalDigits,
} from "@/utils/phoneCountries";

interface PhoneNumberInputProps {
  label?: string;
  // Full number, e.g. "+966501234567". Local/bare numbers ("0501234567") are
  // accepted and read against the selected country.
  value?: string;
  // Emits the canonical "+<dialCode><national>" form, or "" when cleared
  onChange: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export const PhoneNumberInput = ({
  label,
  value,
  onChange,
  onBlur,
  defaultCountry = DEFAULT_PHONE_COUNTRY,
  error,
  hint,
  required,
  disabled,
  id,
  name,
}: PhoneNumberInputProps) => {
  const { t, i18n } = useTranslation();
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedIso2, setSelectedIso2] = useState(
    getPhoneCountry(defaultCountry).iso2,
  );

  // An international value carries its own country; a local one uses the selection
  const { country, national, unsupportedDigits } = parsePhoneNumber(
    value,
    selectedIso2,
  );
  // A code we don't list stays visible as typed so the agent can correct it
  const displayValue = unsupportedDigits ? `+${unsupportedDigits}` : national;

  const countryOptions = useMemo(
    () =>
      PHONE_COUNTRIES.map((c) => {
        const name = getPhoneCountryName(c, i18n.language);
        return {
          iso2: c.iso2,
          dialCode: c.dialCode,
          name,
          // Search matches the localized name, the English name and the code
          keywords: [name, c.name, c.dialCode, `+${c.dialCode}`],
        };
      }),
    [i18n.language],
  );

  const handleCountryChange = (iso2: string) => {
    const next = getPhoneCountry(iso2);
    setSelectedIso2(next.iso2);
    onChange(formatPhoneNumber(next, national));
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleNumberChange = (text: string) => {
    // Pasting a full international number switches the country to match
    if (/^\s*(\+|00)/.test(text)) {
      const parsed = parsePhoneNumber(text, country.iso2);
      if (parsed.unsupportedDigits) {
        onChange(`+${parsed.unsupportedDigits}`);
        return;
      }
      setSelectedIso2(parsed.country.iso2);
      onChange(formatPhoneNumber(parsed.country, parsed.national));
      return;
    }
    setSelectedIso2(country.iso2);
    onChange(formatPhoneNumber(country, toNationalDigits(text)));
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2"
        >
          {label}
          {required && (
            <span className="text-[hsl(var(--destructive))] ms-1">*</span>
          )}
        </label>
      )}
      {/* Phone numbers always read left-to-right, including in Arabic */}
      <div
        dir="ltr"
        className={cn(
          "flex w-full bg-[hsl(var(--background))] border-2 rounded-xl transition-all duration-200",
          disabled && "bg-[hsl(var(--muted))] cursor-not-allowed",
          error
            ? "border-[hsl(var(--destructive)/0.5)] focus-within:border-[hsl(var(--destructive))] focus-within:ring-4 focus-within:ring-[hsl(var(--destructive)/0.1)]"
            : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground)/0.3)] focus-within:border-[hsl(var(--primary))] focus-within:ring-4 focus-within:ring-[hsl(var(--primary)/0.1)]",
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={t("common.countryCode", "Country code")}
              className="flex items-center gap-1 ps-4 pe-3 border-e border-[hsl(var(--border))] rounded-s-xl text-sm text-[hsl(var(--foreground))] whitespace-nowrap hover:bg-[hsl(var(--muted)/0.5)] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-[hsl(var(--muted)/0.5)] disabled:cursor-not-allowed"
            >
              <span className="font-medium">{country.iso2}</span>
              <span>+{country.dialCode}</span>
              <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput
                placeholder={t("common.searchCountry", "Search country...")}
              />
              <CommandList className="max-h-64">
                <CommandEmpty>
                  {t("common.noCountryFound", "No country found")}
                </CommandEmpty>
                <CommandGroup>
                  {countryOptions.map((c) => (
                    <CommandItem
                      key={c.iso2}
                      value={c.iso2}
                      keywords={c.keywords}
                      data-checked={c.iso2 === country.iso2}
                      onSelect={handleCountryChange}
                    >
                      <span className="w-7 font-medium text-muted-foreground">
                        {c.iso2}
                      </span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-muted-foreground" dir="ltr">
                        +{c.dialCode}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={displayValue}
          onChange={(e) => handleNumberChange(e.target.value)}
          onBlur={onBlur}
          placeholder={country.example}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="flex-1 min-w-0 px-4 py-3 bg-transparent rounded-e-xl text-[hsl(var(--foreground))] caret-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:text-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed"
        />
        {error && (
          <div className="flex items-center pe-4 pointer-events-none">
            <AlertCircle className="w-5 h-5 text-[hsl(var(--destructive))]" />
          </div>
        )}
      </div>
      {(error || hint) && (
        <p
          className={cn(
            "mt-2 text-sm",
            error
              ? "text-[hsl(var(--destructive))]"
              : "text-[hsl(var(--muted-foreground))]",
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
};
