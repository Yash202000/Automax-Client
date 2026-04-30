import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportFieldDefinition } from "../../types";
import { groupFieldsByCategory } from "../../constants/reportFields";
import { Info } from "lucide-react";

interface ColumnSelectorProps {
  fields: ReportFieldDefinition[];
  selectedColumns: { field: string; label: string }[];
  onChange: (columns: { field: string; label: string }[]) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  fields,
  selectedColumns,
  onChange,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Group fields by category
  const groupedFields = useMemo(() => groupFieldsByCategory(fields), [fields]);
  const categories = Object.keys(groupedFields);

  // Filter fields based on search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedFields;

    const searchLower = search.toLowerCase();
    const filtered: Record<string, ReportFieldDefinition[]> = {};

    Object.entries(groupedFields).forEach(([category, categoryFields]) => {
      const matchingFields = categoryFields.filter(
        (f) =>
          f.label.toLowerCase().includes(searchLower) ||
          f.field.toLowerCase().includes(searchLower),
      );
      if (matchingFields.length > 0) {
        filtered[category] = matchingFields;
      }
    });

    return filtered;
  }, [groupedFields, search]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleColumn = (field: string) => {
    const found = selectedColumns.findIndex((c) => c.field === field);
    if (found !== -1) {
      onChange(selectedColumns.filter((c) => c.field !== field));
    } else {
      onChange([...selectedColumns, { field: field, label: field }]);
    }
  };

  const selectAll = () => {
    onChange(fields.map((f) => ({ field: f.field, label: f.label })));
  };

  const selectNone = () => {
    onChange([]);
  };

  const selectDefaults = () => {
    onChange(
      fields
        .filter((f) => f.defaultSelected)
        .map((f) => ({ field: f.field, label: f.label })),
    );
  };

  const updateLabel = (field: string, label: string) => {
    const updatedColumns = selectedColumns.map((c) =>
      c.field === field ? { ...c, label } : c,
    );
    onChange(updatedColumns);
  };

  // Auto-expand all categories when searching
  React.useEffect(() => {
    if (search.trim()) {
      setExpandedCategories(new Set(Object.keys(filteredGroups)));
    }
  }, [search, filteredGroups]);

  return (
    <div className="space-y-3">
      {/* Search and actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("reports.columnSelector.searchColumns")}
            className="w-full ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-2 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
          >
            {t("reports.columnSelector.all")}
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          >
            {t("reports.columnSelector.none")}
          </button>
          <button
            type="button"
            onClick={selectDefaults}
            className="px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          >
            {t("reports.columnSelector.defaults")}
          </button>
        </div>
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {selectedColumns.length}{" "}
          {t("reports.columnSelector.columnsSelected", {
            total: fields.length,
          })}
        </span>
        {selectedColumns.length > 10 && (
          <span className="text-red-500 text-xs flex gap-1 items-center">
            <Info className="w-4 h-4" />
            {t("reports.pleaseNoteThatIfYouSelectMore")}
          </span>
        )}
      </div>

      {/* Column list grouped by category */}
      <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden divide-y divide-[hsl(var(--border))]">
        {categories.map((category) => {
          const categoryFields = filteredGroups[category];
          if (!categoryFields || categoryFields.length === 0) return null;

          const isExpanded = expandedCategories.has(category) || search.trim();
          const selectedInCategory = categoryFields.filter(
            (f) => selectedColumns.findIndex((c) => c.field === f.field) !== -1,
          ).length;

          return (
            <div key={category}>
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  )}
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {category}
                  </span>
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {selectedInCategory}/{categoryFields.length}
                </span>
              </button>

              {/* Category fields */}
              {isExpanded && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 p-2 bg-[hsl(var(--card))]">
                  {categoryFields.map((field) => {
                    const isSelected =
                      selectedColumns.findIndex(
                        (c) => c.field === field.field,
                      ) !== -1;
                    const labelVal = selectedColumns.find(
                      (c) => c.field === field.field,
                    );
                    return (
                      <label
                        key={field.field}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                          isSelected
                            ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                            : "hover:bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))]",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))]",
                          )}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2 items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleColumn(field.field)}
                              className="sr-only"
                            />
                            <span
                              className="text-sm truncate"
                              title={field.label}
                            >
                              {field.label}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={labelVal?.label}
                            onChange={(e) =>
                              updateLabel(field.field, e.target.value)
                            }
                            placeholder={t("reports.labelName")}
                            disabled={!isSelected}
                            className="border border-gray-300 text-gray-700 rounded-sm text-sm px-2 py-2 w-full"
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ColumnSelector;
