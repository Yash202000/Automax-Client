import React from 'react';
import type { LookupCategory, ValidationRules } from '../../types';

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
  const fieldType = category.field_type || 'select';

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

  const commonClasses = "w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all";
  const errorClasses = error ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : "";

  switch (fieldType) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {category.name} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            minLength={validationRules.minLength}
            maxLength={validationRules.maxLength}
            pattern={validationRules.pattern}
            className={`${commonClasses} ${errorClasses}`}
            placeholder={category.description || `Enter ${category.name}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {category.name} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            minLength={validationRules.minLength}
            maxLength={validationRules.maxLength}
            rows={4}
            className={`${commonClasses} ${errorClasses} resize-none`}
            placeholder={category.description || `Enter ${category.name}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {category.name} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : null)}
            required={required || validationRules.required}
            min={validationRules.minValue}
            max={validationRules.maxValue}
            className={`${commonClasses} ${errorClasses}`}
            placeholder={category.description || `Enter ${category.name}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {category.name} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            min={validationRules.minDate}
            max={validationRules.maxDate}
            className={`${commonClasses} ${errorClasses}`}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={`lookup_${category.id}`}
            checked={value || false}
            onChange={(e) => handleChange(e.target.checked)}
            className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
          />
          <label htmlFor={`lookup_${category.id}`} className="text-sm text-[hsl(var(--foreground))]">
            {category.name} {required && <span className="text-red-500">*</span>}
          </label>
          {error && <p className="ml-7 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {category.name} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={required || validationRules.required}
            className={`${commonClasses} ${errorClasses}`}
          >
            <option value="">Select {category.name}</option>
            {category.values?.filter(v => v.is_active).map((lookupValue) => (
              <option key={lookupValue.id} value={lookupValue.id}>
                {lookupValue.name}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'multiselect':
      return (
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            {category.name} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              handleChange(selectedOptions);
            }}
            required={required || validationRules.required}
            className={`${commonClasses} ${errorClasses}`}
            size={Math.min(category.values?.length || 3, 5)}
          >
            {category.values?.filter(v => v.is_active).map((lookupValue) => (
              <option key={lookupValue.id} value={lookupValue.id}>
                {lookupValue.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Hold Ctrl/Cmd to select multiple options
          </p>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    default:
      return null;
  }
};
