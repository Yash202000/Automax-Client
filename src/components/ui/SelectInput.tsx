import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Option = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type SelectProps = {
  /** Full list of options */
  options: Option[];
  /** Currently selected value */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Placeholder shown when nothing selected */
  placeholder?: string;
  /** Enable the search/filter input inside the dropdown */
  searchable?: boolean;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Allow clearing the selected value */
  clearable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Optional label shown above the control */
  label?: string;
  /** Optional helper text below */
  helperText?: string;
  /** Error message — red border + text */
  error?: string;
  /** className forwarded to root wrapper */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchable = false,
  searchPlaceholder = "Search…",
  clearable = false,
  disabled = false,
  label,
  helperText,
  error,
  className,
  size = "md",
}: SelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Focus search when dropdown opens ─────────────────────────────────────
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, searchable]);

  const selectedOption = options.find((o) => o.value === value);
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
    if ((e.key === "Enter" || e.key === " ") && !open) {
      e.preventDefault();
      setOpen(true);
    }
  };

  // ── Size classes ──────────────────────────────────────────────────────────
  const triggerPadding = {
    sm: "px-3 py-1.5 min-h-[34px]",
    md: "px-3.5 py-2 min-h-[42px]",
    lg: "px-4 py-2.5 min-h-[50px]",
  }[size];

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* ── Label ── */}
      {label && (
        <label
          className={cn(
            "block text-sm font-medium mb-1.5",
            error
              ? "text-[hsl(var(--destructive))]"
              : "text-[hsl(var(--foreground))]",
          )}
        >
          {label}
        </label>
      )}

      {/* ── Trigger ── */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center justify-between w-full rounded-lg border cursor-pointer",
          "bg-[hsl(var(--background))] transition-all duration-150 select-none",
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.25)] focus:border-[hsl(var(--primary))]",
          triggerPadding,
          open &&
            "ring-2 ring-[hsl(var(--primary)/0.25)] border-[hsl(var(--primary))]",
          error
            ? "border-[hsl(var(--destructive))] focus:ring-[hsl(var(--destructive)/0.25)]"
            : "border-[hsl(var(--border))]",
          disabled &&
            "opacity-50 cursor-not-allowed bg-[hsl(var(--muted)/0.5)]",
        )}
      >
        {/* Selected value or placeholder */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption?.icon && (
            <span className="shrink-0 text-[hsl(var(--muted-foreground))]">
              {selectedOption.icon}
            </span>
          )}
          {selectedOption ? (
            <span
              className={cn(
                "truncate font-medium text-[hsl(var(--foreground))]",
                textSize,
              )}
            >
              {selectedOption.label}
            </span>
          ) : (
            <span
              className={cn("text-[hsl(var(--muted-foreground))]", textSize)}
            >
              {placeholder}
            </span>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="opacity-40 hover:opacity-80 transition-opacity rounded p-0.5 hover:bg-[hsl(var(--muted))]"
              aria-label={t("goals.components.bulk.clearTitle")}
            >
              <X className="w-3.5 h-3.5 text-[hsl(var(--foreground))]" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "text-[hsl(var(--muted-foreground))] transition-transform duration-200",
              size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4",
              open && "rotate-180",
            )}
          />
        </div>
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-full rounded-xl border border-[hsl(var(--border))]",
            "bg-[hsl(var(--background))] shadow-xl shadow-black/10",
            "overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-100",
          )}
        >
          {/* Search */}
          {searchable && (
            <div className="p-2 border-b border-[hsl(var(--border))]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "w-full pl-8 pr-3 py-1.5 text-sm rounded-md",
                    "bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]",
                    "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]",
                    "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary))]",
                    "transition-all",
                  )}
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {t("common.noOptionsFound")}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option.value);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      "focus:outline-none",
                      isSelected
                        ? "bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
                      option.disabled &&
                        "opacity-40 cursor-not-allowed hover:bg-transparent",
                    )}
                  >
                    {/* Check indicator */}
                    <span
                      className={cn(
                        "flex items-center justify-center w-4 h-4 rounded-full border shrink-0 transition-all",
                        isSelected
                          ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--background))]",
                      )}
                    >
                      {isSelected && (
                        <Check
                          className="w-2.5 h-2.5 text-[hsl(var(--primary-foreground))]"
                          strokeWidth={3}
                        />
                      )}
                    </span>

                    {/* Icon */}
                    {option.icon && (
                      <span className="shrink-0 text-[hsl(var(--muted-foreground))]">
                        {option.icon}
                      </span>
                    )}

                    {/* Label + description */}
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block truncate",
                          size === "sm" ? "text-xs" : "text-sm",
                          isSelected ? "font-medium" : "font-normal",
                        )}
                      >
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="block text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Helper / Error text ── */}
      {(helperText || error) && (
        <p
          className={cn(
            "mt-1.5 text-xs",
            error
              ? "text-[hsl(var(--destructive))]"
              : "text-[hsl(var(--muted-foreground))]",
          )}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}

export default Select;
