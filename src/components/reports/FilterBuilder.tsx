import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportFilter, ReportFieldDefinition, FilterOperator, FilterValue } from '../../types';
import { getOperatorsForFieldType } from '../../constants/reportFields';

interface FilterBuilderProps {
  fields: ReportFieldDefinition[];
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
}

interface FilterRowProps {
  filter: ReportFilter;
  fields: ReportFieldDefinition[];
  onChange: (filter: ReportFilter) => void;
  onRemove: () => void;
}

// Generate a unique ID for new filters
const generateFilterId = () => `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Filter Row Component
const FilterRow: React.FC<FilterRowProps> = ({ filter, fields, onChange, onRemove }) => {
  const selectedField = fields.find((f) => f.field === filter.field);
  const fieldType = selectedField?.type || 'string';
  const operators = getOperatorsForFieldType(fieldType);

  const handleFieldChange = (field: string) => {
    const newField = fields.find((f) => f.field === field);
    const newOperators = getOperatorsForFieldType(newField?.type || 'string');
    const newOperator = newOperators[0]?.value || 'equals';
    onChange({ ...filter, field, operator: newOperator, value: null });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    let newValue: FilterValue = filter.value;
    // Reset value for certain operator types
    if (operator === 'between') {
      newValue = { from: '', to: '' };
    } else if (operator === 'in' || operator === 'not_in') {
      newValue = [];
    } else if (operator === 'is_empty' || operator === 'is_not_empty') {
      newValue = null;
    }
    onChange({ ...filter, operator, value: newValue });
  };

  const handleValueChange = (value: FilterValue) => {
    onChange({ ...filter, value });
  };

  // Render value input based on field type and operator
  const renderValueInput = () => {
    // No value input needed for these operators
    if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
      return null;
    }

    // Boolean field
    if (fieldType === 'boolean') {
      return (
        <select
          value={String(filter.value ?? '')}
          onChange={(e) => handleValueChange(e.target.value === 'true')}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        >
          <option value="">Select...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    // Enum field with options
    if (fieldType === 'enum' && selectedField?.options) {
      if (filter.operator === 'in' || filter.operator === 'not_in') {
        // Multi-select for 'in' / 'not_in'
        const selectedValues: Array<string | number> = Array.isArray(filter.value) ? (filter.value as Array<string | number>) : [];
        return (
          <div className="flex-1 flex flex-wrap gap-1 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg min-h-[38px]">
            {selectedField.options.map((opt) => {
              const isSelected = selectedValues.some((v) => v === opt.value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      handleValueChange(selectedValues.filter((v) => v !== opt.value) as (string | number)[]);
                    } else {
                      handleValueChange([...selectedValues, opt.value] as (string | number)[]);
                    }
                  }}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md transition-colors",
                    isSelected
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.8)]"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }

      // Single select dropdown
      return (
        <select
          value={String(filter.value ?? '')}
          onChange={(e) => {
            const opt = selectedField.options?.find((o) => String(o.value) === e.target.value);
            handleValueChange(opt?.value ?? e.target.value);
          }}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        >
          <option value="">Select...</option>
          {selectedField.options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // Between operator - two inputs
    if (filter.operator === 'between') {
      const rangeValue = filter.value as { from: string; to: string } | null;
      const inputType = fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : fieldType === 'datetime' ? 'datetime-local' : 'text';
      return (
        <div className="flex-1 flex items-center gap-2">
          <input
            type={inputType}
            value={rangeValue?.from || ''}
            onChange={(e) => handleValueChange({ from: e.target.value, to: rangeValue?.to || '' })}
            placeholder="From"
            className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
          />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">to</span>
          <input
            type={inputType}
            value={rangeValue?.to || ''}
            onChange={(e) => handleValueChange({ from: rangeValue?.from || '', to: e.target.value })}
            placeholder="To"
            className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
          />
        </div>
      );
    }

    // Date/datetime field
    if (fieldType === 'date' || fieldType === 'datetime') {
      const inputType = fieldType === 'date' ? 'date' : 'datetime-local';
      return (
        <input
          type={inputType}
          value={String(filter.value ?? '')}
          onChange={(e) => handleValueChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        />
      );
    }

    // Number field
    if (fieldType === 'number') {
      return (
        <input
          type="number"
          value={String(filter.value ?? '')}
          onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="Enter value..."
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={String(filter.value ?? '')}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="Enter value..."
        className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
      />
    );
  };

  return (
    <div className="flex items-start gap-2 p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg">
      {/* Field selector */}
      <select
        value={filter.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="w-40 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
      >
        <option value="">Select field...</option>
        {fields
          .filter((f) => f.filterable)
          .map((f) => (
            <option key={f.field} value={f.field}>
              {f.label}
            </option>
          ))}
      </select>

      {/* Operator selector */}
      <select
        value={filter.operator}
        onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
        className="w-36 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* Value input */}
      {renderValueInput()}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// Filter Builder Component
export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  filters,
  onChange,
}) => {
  const addFilter = () => {
    const firstFilterableField = fields.find((f) => f.filterable);
    if (!firstFilterableField) return;

    const operators = getOperatorsForFieldType(firstFilterableField.type);
    const newFilter: ReportFilter = {
      id: generateFilterId(),
      field: firstFilterableField.field,
      operator: operators[0]?.value || 'equals',
      value: null,
    };
    onChange([...filters, newFilter]);
  };

  const updateFilter = (index: number, filter: ReportFilter) => {
    const newFilters = [...filters];
    newFilters[index] = filter;
    onChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    onChange([]);
  };

  const filterableFields = fields.filter((f) => f.filterable);

  if (filterableFields.length === 0) {
    return (
      <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
        No filterable fields available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters list */}
      {filters.length === 0 ? (
        <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4 border border-dashed border-[hsl(var(--border))] rounded-lg">
          No filters added. Click "Add Filter" to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <FilterRow
              key={filter.id}
              filter={filter}
              fields={filterableFields}
              onChange={(f) => updateFilter(index, f)}
              onRemove={() => removeFilter(index)}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addFilter}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Filter
        </button>
        {filters.length > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBuilder;
