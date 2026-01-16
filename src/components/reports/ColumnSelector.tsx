import React, { useState, useMemo } from 'react';
import { Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportFieldDefinition } from '../../types';
import { groupFieldsByCategory } from '../../constants/reportFields';

interface ColumnSelectorProps {
  fields: ReportFieldDefinition[];
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  fields,
  selectedColumns,
  onChange,
}) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
          f.field.toLowerCase().includes(searchLower)
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
    if (selectedColumns.includes(field)) {
      onChange(selectedColumns.filter((c) => c !== field));
    } else {
      onChange([...selectedColumns, field]);
    }
  };

  const selectAll = () => {
    onChange(fields.map((f) => f.field));
  };

  const selectNone = () => {
    onChange([]);
  };

  const selectDefaults = () => {
    onChange(fields.filter((f) => f.defaultSelected).map((f) => f.field));
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns..."
            className="w-full pl-9 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-2 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
          >
            All
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          >
            None
          </button>
          <button
            type="button"
            onClick={selectDefaults}
            className="px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          >
            Defaults
          </button>
        </div>
      </div>

      {/* Selected count */}
      <div className="text-xs text-[hsl(var(--muted-foreground))]">
        {selectedColumns.length} of {fields.length} columns selected
      </div>

      {/* Column list grouped by category */}
      <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden divide-y divide-[hsl(var(--border))]">
        {categories.map((category) => {
          const categoryFields = filteredGroups[category];
          if (!categoryFields || categoryFields.length === 0) return null;

          const isExpanded = expandedCategories.has(category) || search.trim();
          const selectedInCategory = categoryFields.filter((f) =>
            selectedColumns.includes(f.field)
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
                    const isSelected = selectedColumns.includes(field.field);
                    return (
                      <label
                        key={field.field}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                          isSelected
                            ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                            : "hover:bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))]"
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))]"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleColumn(field.field)}
                          className="sr-only"
                        />
                        <span className="text-sm truncate" title={field.label}>
                          {field.label}
                        </span>
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
