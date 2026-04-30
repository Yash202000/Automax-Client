import React, { useState, useRef, useEffect, useCallback } from "react";
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

export type MultiSelectProps = {
  /** Full list of options */
  options: Option[];
  /** Currently selected values */
  value: string[];
  /** Called when selection changes */
  onChange: (values: string[]) => void;
  /** Placeholder shown when nothing selected */
  placeholder?: string;
  /** Enable the search/filter input inside the dropdown */
  searchable?: boolean;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Max chips shown inline before collapsing into "+N more" */
  maxTagCount?: number;
  /** Max number of items the user can select (0 = unlimited) */
  maxSelect?: number;
  /** Disabled state for the whole component */
  disabled?: boolean;
  /** Show a "Select all / Clear all" quick action */
  showSelectAll?: boolean;
  /** Optional label shown above the control */
  label?: string;
  /** Optional helper text below the control */
  helperText?: string;
  /** Error message – red border + text */
  error?: string;
  /** className forwarded to the root wrapper */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show footer with selection count and clear button */
  showFooter?: boolean;
};

// ─── Chip ─────────────────────────────────────────────────────────────────────

const Chip = ({
  label,
  onRemove,
  disabled,
  size = "md",
}: {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-md font-medium transition-all",
      "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]",
      size === "sm" && "text-xs px-1.5 py-0.5",
      size === "md" && "text-xs px-2 py-1",
      size === "lg" && "text-sm px-2.5 py-1",
    )}
  >
    {label}
    {!disabled && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          "rounded-sm opacity-60 hover:opacity-100 hover:bg-[hsl(var(--primary)/0.2)]",
          "transition-all focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
          size === "sm" && "p-0.5",
          size === "md" && "p-0.5",
          size === "lg" && "p-1",
        )}
        aria-label={`Remove ${label}`}
      >
        <X className={cn(size === "lg" ? "w-3 h-3" : "w-2.5 h-2.5")} />
      </button>
    )}
  </span>
);

// ─── OverflowBadge ────────────────────────────────────────────────────────────

const OverflowBadge = ({
  count,
  size = "md",
}: {
  count: number;
  size?: "sm" | "md" | "lg";
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md font-semibold",
      "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]",
      size === "sm" && "text-xs px-1.5 py-0.5",
      size === "md" && "text-xs px-2 py-1",
      size === "lg" && "text-sm px-2.5 py-1",
    )}
  >
    +{count}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchable = false,
  searchPlaceholder = "Search…",
  maxTagCount,
  maxSelect = 0,
  disabled = false,
  showSelectAll = false,
  label,
  helperText,
  error,
  className,
  size = "md",
  showFooter,
}: MultiSelectProps) {
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedOptions = options.filter((o) => value.includes(o.value));
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const isAtMax = maxSelect > 0 && value.length >= maxSelect;
  const allSelectableValues = options
    .filter((o) => !o.disabled)
    .map((o) => o.value);
  const allSelected = allSelectableValues.every((v) => value.includes(v));

  const toggle = useCallback(
    (val: string) => {
      const opt = options.find((o) => o.value === val);
      if (opt?.disabled) return;
      if (value.includes(val)) {
        onChange(value.filter((v) => v !== val));
      } else {
        if (isAtMax) return;
        onChange([...value, val]);
      }
    },
    [value, onChange, isAtMax, options],
  );

  const removeChip = useCallback(
    (val: string) => onChange(value.filter((v) => v !== val)),
    [value, onChange],
  );

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      const selectable = options.filter((o) => !o.disabled).map((o) => o.value);
      const limited =
        maxSelect > 0 ? selectable.slice(0, maxSelect) : selectable;
      onChange(limited);
    }
  };

  // ── Keyboard nav ──────────────────────────────────────────────────────────
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

  // ── Chips display ─────────────────────────────────────────────────────────
  const visibleChips =
    maxTagCount !== undefined
      ? selectedOptions.slice(0, maxTagCount)
      : selectedOptions;
  const overflowCount =
    maxTagCount !== undefined
      ? Math.max(0, selectedOptions.length - maxTagCount)
      : 0;

  // ── Size classes ──────────────────────────────────────────────────────────
  const triggerPadding = {
    sm: "px-3 py-1.5 min-h-[34px]",
    md: "px-3.5 py-2 min-h-[42px]",
    lg: "px-4 py-2.5 min-h-[50px]",
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
          "flex flex-wrap items-center gap-1.5 w-full rounded-lg border cursor-pointer",
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
        {/* Chips */}
        <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
          {selectedOptions.length === 0 ? (
            <span
              className={cn(
                "text-[hsl(var(--muted-foreground))]",
                size === "sm" && "text-xs",
                size === "md" && "text-sm",
                size === "lg" && "text-base",
              )}
            >
              {placeholder}
            </span>
          ) : (
            <>
              {visibleChips.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  size={size}
                  disabled={disabled}
                  onRemove={() => removeChip(opt.value)}
                />
              ))}
              {overflowCount > 0 && (
                <OverflowBadge count={overflowCount} size={size} />
              )}
            </>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0 pl-1">
          {!disabled && value.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="opacity-40 hover:opacity-80 transition-opacity rounded p-0.5 hover:bg-[hsl(var(--muted))]"
              aria-label={t("goals.okr.clearAll")}
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
          {/* Search input */}
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

          {/* Select all */}
          {showSelectAll && !search && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAll();
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2",
                "text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide",
                "hover:bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] transition-colors",
              )}
            >
              <span>{allSelected ? "Clear all" : "Select all"}</span>
              {allSelected && <X className="w-3 h-3" />}
            </button>
          )}

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {t("common.noOptionsFound")}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled = option.disabled || (!isSelected && isAtMax);

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(option.value);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      "focus:outline-none",
                      isSelected
                        ? "bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
                      isDisabled &&
                        "opacity-40 cursor-not-allowed hover:bg-transparent",
                    )}
                  >
                    {/* Checkbox */}
                    <span
                      className={cn(
                        "flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-all",
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

                    {/* Icon (optional) */}
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

          {/* Footer: selection count */}
          {showFooter && value.length > 0 && (
            <div className="px-3 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {value.length} {t("reports.selected")}{" "}
                {maxSelect > 0 && ` / ${maxSelect} max`}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                className="text-xs text-[hsl(var(--destructive))] hover:underline transition-all"
              >
                {t("common.clear")}
              </button>
            </div>
          )}
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

export default MultiSelect;
