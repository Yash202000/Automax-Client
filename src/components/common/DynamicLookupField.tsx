import React, { useState } from "react";
import { X } from "lucide-react";
import type { LookupCategory, ValidationRules } from "../../types";
import { useTranslation } from "react-i18next";
import { getLocalizedName } from "@/lib/utils";

interface MultiValueFieldProps {
  inputType: "text" | "number";
  values: string[];
  // eslint-disable-next-line no-unused-vars
  onChange: (values: string[]) => void;
  placeholder?: string;
  inputClassName: string;
}

// Accumulates entries into a list instead of replacing a single value —
// e.g. a "Visit Number" field where every transition adds a new visit
// number without discarding the ones already recorded.
const MultiValueField: React.FC<MultiValueFieldProps> = ({
  inputType,
  values,
  onChange,
  placeholder,
  inputClassName,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v, index) => (
            <span
              key={`${v}-${index}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="hover:text-[hsl(var(--destructive))] transition-colors"
                aria-label={t("common.remove", "Remove")}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type={inputType}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder={placeholder}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim()}
          className="px-4 py-2 text-sm font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("common.add", "Add")}
        </button>
      </div>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
        {t(
          "lookups.multipleValuesHint",
          "Press Enter or click Add — previously added values are kept.",
        )}
      </p>
    </div>
  );
};

interface DynamicLookupFieldProps {
  category: LookupCategory;
  value: any;
  onChange: (categoryId: string, value: any) => void;
  required?: boolean;
  error?: string;
}

export const DynamicLookupField: React.FC<DynamicLookupFieldProps> = ({
  category,
  value,
  onChange,
  required = false,
  error,
}) => {
  const { t } = useTranslation();
  const fieldType = category.field_type || "select";
  const fieldLabel = getLocalizedName(category);

  // Parse validation rules
  let validationRules: ValidationRules = {};
  if (category.validation_rules) {
    try {
      validationRules = JSON.parse(category.validation_rules);
    } catch (e) {
      validationRules = {};
    }
  }

  const handleChange = (newValue: any) => {
    onChange(category.id, newValue);
  };

  const commonClasses =
    "w-full px-4 py-3 bg-[hsl(var(--background))] border-2 border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all";
  const errorClasses = error
    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
    : "";

  switch (fieldType) {
    case "text":
      if (validationRules.allowMultiple) {
        return (
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              {fieldLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <MultiValueField
              inputType="text"
              values={Array.isArray(value) ? value : []}
              onChange={handleChange}
              placeholder={category.description || `Enter ${fieldLabel}`}
              inputClassName={`${commonClasses} ${errorClasses}`}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
        );
      }
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {fieldLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            minLength={validationRules.minLength}
            maxLength={validationRules.maxLength}
            pattern={validationRules.pattern}
            className={`${commonClasses} ${errorClasses}`}
            placeholder={category.description || `Enter ${fieldLabel}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case "textarea":
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {fieldLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            minLength={validationRules.minLength}
            maxLength={validationRules.maxLength}
            rows={4}
            className={`${commonClasses} ${errorClasses} resize-none`}
            placeholder={category.description || `Enter ${fieldLabel}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case "number":
      if (validationRules.allowMultiple) {
        return (
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              {fieldLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <MultiValueField
              inputType="number"
              values={Array.isArray(value) ? value : []}
              onChange={handleChange}
              placeholder={category.description || `Enter ${fieldLabel}`}
              inputClassName={`${commonClasses} ${errorClasses}`}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
        );
      }
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {fieldLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            value={value || ""}
            onChange={(e) =>
              handleChange(e.target.value ? parseFloat(e.target.value) : null)
            }
            required={required || validationRules.required}
            min={validationRules.minValue}
            max={validationRules.maxValue}
            className={`${commonClasses} ${errorClasses}`}
            placeholder={category.description || `Enter ${fieldLabel}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case "date":
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {fieldLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="datetime-local"
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            min={validationRules.minDate}
            max={validationRules.maxDate}
            className={`${commonClasses} ${errorClasses}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={`lookup_${category.id}`}
            checked={value || false}
            onChange={(e) => handleChange(e.target.checked)}
            className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
          />
          <label
            htmlFor={`lookup_${category.id}`}
            className="text-sm text-[hsl(var(--foreground))]"
          >
            {fieldLabel} {required && <span className="text-red-500">*</span>}
          </label>
          {error && <p className="ml-7 text-xs text-red-500">{error}</p>}
        </div>
      );

    case "select":
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {fieldLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            className={`${commonClasses} ${errorClasses}`}
          >
            <option value="">
              {t("common.select")} {fieldLabel}
            </option>
            {category.values
              ?.filter((v) => v.is_active)
              .map((lookupValue) => (
                <option key={lookupValue.id} value={lookupValue.id}>
                  {getLocalizedName(lookupValue)}
                </option>
              ))}
          </select>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case "multiselect":
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {fieldLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selectedOptions = Array.from(
                e.target.selectedOptions,
                (option) => option.value,
              );
              handleChange(selectedOptions);
            }}
            required={required || validationRules.required}
            className={`${commonClasses} ${errorClasses}`}
            size={Math.min(category.values?.length || 3, 5)}
          >
            {category.values
              ?.filter((v) => v.is_active)
              .map((lookupValue) => (
                <option key={lookupValue.id} value={lookupValue.id}>
                  {getLocalizedName(lookupValue)}
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {t("lookups.holdCtrlCmdToSelectMultipleOptions")}
          </p>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    default:
      return null;
  }
};
