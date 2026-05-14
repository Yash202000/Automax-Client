import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import type {
  ReportFilter,
  ReportFieldDefinition,
  // FilterOperator,
  FilterValue,
} from "../../types";
import { getOperatorsForFieldType } from "../../constants/reportFields";
import { MultiSelect } from "../../components/ui/MultiSelect";

interface FilterBuilderProps {
  fields: ReportFieldDefinition[];
  filters: ReportFilter[];
  enableAddFilter?: boolean;
  onChange: (filters: ReportFilter[]) => void;
}

interface FilterRowProps {
  filter: ReportFilter;
  fields: ReportFieldDefinition[];
  enableAddFilter?: boolean;
  onChange: (filter: ReportFilter) => void;
  onRemove: () => void;
  t: (key: string) => string;
}

// Generate a unique ID for new filters
const generateFilterId = () =>
  `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Filter Row Component
const FilterRow: React.FC<FilterRowProps> = ({
  filter,
  fields,
  enableAddFilter,
  onChange,
  onRemove,
  t,
}) => {
  const selectedField = fields.find((f) => f.field === filter.field);
  const fieldType = selectedField?.type || "string";
  // const operators = getOperatorsForFieldType(fieldType);

  const handleFieldChange = (field: string) => {
    const newField = fields.find((f) => f.field === field);
    // For multi-select fields, always use "in" operator
    const newOperator = newField?.multiselect
      ? "in"
      : getOperatorsForFieldType(newField?.type || "string")[0]?.value ||
        "equals";
    onChange({ ...filter, field, operator: newOperator, value: null });
  };

  // const handleOperatorChange = (operator: FilterOperator) => {
  //   let newValue: FilterValue = filter.value;
  //   // Reset value for certain operator types
  //   if (operator === "between") {
  //     newValue = { from: "", to: "" };
  //   } else if (operator === "in" || operator === "not_in") {
  //     newValue = [];
  //   } else if (operator === "is_empty" || operator === "is_not_empty") {
  //     newValue = null;
  //   }
  //   onChange({ ...filter, operator, value: newValue });
  // };

  const handleValueChange = (value: FilterValue) => {
    onChange({ ...filter, value });
  };

  // Render value input based on field type and operator
  const renderValueInput = () => {
    // No value input needed for these operators
    if (filter.operator === "is_empty" || filter.operator === "is_not_empty") {
      return null;
    }

    // Multi-select field
    if (selectedField?.multiselect && selectedField?.options) {
      const selectedValues: Array<string | number> = Array.isArray(filter.value)
        ? (filter.value as Array<string | number>)
        : [];
      return (
        <MultiSelect
          options={selectedField.options.map((opt) => ({
            label: opt.label,
            value: String(opt.value),
          }))}
          value={selectedValues.map(String)}
          onChange={(values) => handleValueChange(values)}
          placeholder={t("reports.filterBuilder.selectValue")}
          searchable
          maxTagCount={2}
        />
      );
    }

    // Boolean field
    if (fieldType === "boolean") {
      return (
        <select
          value={String(filter.value ?? "")}
          onChange={(e) => handleValueChange(e.target.value === "true")}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        >
          <option value="">{t("reports.filterBuilder.selectValue")}</option>
          <option value="true">{t("reports.filterBuilder.yes")}</option>
          <option value="false">{t("reports.filterBuilder.no")}</option>
        </select>
      );
    }

    // Enum field with options
    if (fieldType === "enum" && selectedField?.options) {
      if (filter.operator === "in" || filter.operator === "not_in") {
        const selectedValues: Array<string | number> = Array.isArray(
          filter.value,
        )
          ? (filter.value as Array<string | number>)
          : [];

        return (
          <MultiSelect
            options={selectedField.options.map((opt) => ({
              label: opt.label,
              value: String(opt.value),
            }))}
            value={selectedValues.map(String)}
            onChange={(values) => handleValueChange(values)}
            placeholder={t("reports.filterBuilder.selectValue")}
            searchable
            maxTagCount={2}
          />
        );
      }

      // Single select dropdown
      return (
        <select
          value={String(filter.value ?? "")}
          onChange={(e) => {
            const opt = selectedField.options?.find(
              (o) => String(o.value) === e.target.value,
            );
            handleValueChange(opt?.value ?? e.target.value);
          }}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        >
          <option value="">{t("reports.filterBuilder.selectValue")}</option>
          {selectedField.options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // Between operator - two inputs
    if (filter.operator === "between") {
      const rangeValue = filter.value as { from: string; to: string } | null;
      const inputType =
        fieldType === "number"
          ? "number"
          : fieldType === "date"
            ? "date"
            : fieldType === "datetime"
              ? "datetime-local"
              : "text";
      return (
        <div className="flex-1 flex items-center gap-2">
          <input
            type={inputType}
            value={rangeValue?.from || ""}
            onChange={(e) =>
              handleValueChange({
                from: e.target.value,
                to: rangeValue?.to || "",
              })
            }
            placeholder={t("reports.filterBuilder.from")}
            className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
          />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("reports.filterBuilder.to")}
          </span>
          <input
            type={inputType}
            value={rangeValue?.to || ""}
            onChange={(e) =>
              handleValueChange({
                from: rangeValue?.from || "",
                to: e.target.value,
              })
            }
            placeholder={t("reports.filterBuilder.to")}
            className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
          />
        </div>
      );
    }

    // Date/datetime field
    if (fieldType === "date" || fieldType === "datetime") {
      const inputType = fieldType === "date" ? "date" : "datetime-local";
      return (
        <input
          type={inputType}
          value={String(filter.value ?? "")}
          onChange={(e) => handleValueChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        />
      );
    }

    // Number field
    if (fieldType === "number") {
      return (
        <input
          type="number"
          value={String(filter.value ?? "")}
          onChange={(e) =>
            handleValueChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder={t("reports.filterBuilder.enterValue")}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={String(filter.value ?? "")}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={t("reports.filterBuilder.enterValue")}
        className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
      />
    );
  };

  return (
    <div className="relative flex items-center gap-2 p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg overflow-visible">
      {/* Field selector */}
      {enableAddFilter ? (
        <select
          value={filter.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="w-40 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        >
          <option value="">{t("reports.filterBuilder.selectField")}</option>
          {fields
            .filter((f) => f.filterable)
            .map((f) => (
              <option key={f.field} value={f.field}>
                {f.label}
              </option>
            ))}
        </select>
      ) : (
        <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-1/3 shrink-0 truncate">
          {fields.find((f) => f.field === filter.field)?.label}:
        </span>
      )}

      {/* Operator selector */}
      {/* <select
        value={filter.operator}
        onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
        className={`w-36 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]`}
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select> */}

      {/* Value input */}
      {renderValueInput()}

      {/* Remove button */}
      {enableAddFilter && (
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Filter Builder Component
export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  filters,
  enableAddFilter = true,
  onChange,
}) => {
  const { t } = useTranslation();

  const addFilter = () => {
    const firstFilterableField = fields.find((f) => f.filterable);
    if (!firstFilterableField) return;

    const operators = getOperatorsForFieldType(firstFilterableField.type);
    const newFilter: ReportFilter = {
      id: generateFilterId(),
      field: firstFilterableField.field,
      operator: operators[0]?.value || "equals",
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
        {t("reports.filterBuilder.noFilterableFields")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters list */}
      {filters.length === 0 ? (
        <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4 border border-dashed border-[hsl(var(--border))] rounded-lg">
          {enableAddFilter
            ? t("reports.filterBuilder.noFiltersAdded") +
              " " +
              t("reports.filterBuilder.clickAddFilter")
            : t("reports.filterBuilder.noFiltersAdded")}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filters.map((filter, index) => (
            <FilterRow
              key={filter.id}
              filter={filter}
              fields={filterableFields}
              enableAddFilter={enableAddFilter}
              onChange={(f) => updateFilter(index, f)}
              onRemove={() => removeFilter(index)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {enableAddFilter && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addFilter}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("reports.filterBuilder.addFilter")}
          </button>
          {filters.length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
            >
              {t("reports.filterBuilder.clearAll")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBuilder;
