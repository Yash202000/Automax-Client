import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { ReportSort, ReportFieldDefinition } from '../../types';

interface SortingConfigProps {
  fields: ReportFieldDefinition[];
  sorting: ReportSort[];
  onChange: (sorting: ReportSort[]) => void;
}

export const SortingConfig: React.FC<SortingConfigProps> = ({
  fields,
  sorting,
  onChange,
}) => {
  const sortableFields = fields.filter((f) => f.sortable);

  const addSort = () => {
    // Find first sortable field not already in sorting
    const availableField = sortableFields.find(
      (f) => !sorting.some((s) => s.field === f.field)
    );
    if (!availableField) return;

    onChange([...sorting, { field: availableField.field, direction: 'asc' }]);
  };

  const updateSort = (index: number, sort: ReportSort) => {
    const newSorting = [...sorting];
    newSorting[index] = sort;
    onChange(newSorting);
  };

  const removeSort = (index: number) => {
    onChange(sorting.filter((_, i) => i !== index));
  };

  const toggleDirection = (index: number) => {
    const current = sorting[index];
    updateSort(index, {
      ...current,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  // Get available fields (not already used in sorting)
  const getAvailableFields = (currentField: string) => {
    return sortableFields.filter(
      (f) => f.field === currentField || !sorting.some((s) => s.field === f.field)
    );
  };

  if (sortableFields.length === 0) {
    return (
      <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
        No sortable fields available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sorting list */}
      {sorting.length === 0 ? (
        <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4 border border-dashed border-[hsl(var(--border))] rounded-lg">
          No sorting configured. Results will use default order.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sorting.map((sort, index) => {
            const availableFields = getAvailableFields(sort.field);

            return (
              <div
                key={`${sort.field}-${index}`}
                className="flex items-center gap-1 px-3 py-2 bg-[hsl(var(--muted)/0.5)] rounded-lg"
              >
                {/* Sort order indicator */}
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium mr-1">
                  {index + 1}.
                </span>

                {/* Field selector */}
                <select
                  value={sort.field}
                  onChange={(e) => updateSort(index, { ...sort, field: e.target.value })}
                  className="px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                >
                  {availableFields.map((fieldDef) => (
                    <option key={fieldDef.field} value={fieldDef.field}>
                      {fieldDef.label}
                    </option>
                  ))}
                </select>

                {/* Direction toggle */}
                <button
                  type="button"
                  onClick={() => toggleDirection(index)}
                  className="flex items-center gap-1 px-2 py-1 text-sm font-medium hover:bg-[hsl(var(--background))] rounded transition-colors"
                  title={sort.direction === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sort.direction === 'asc' ? (
                    <>
                      <ArrowUp className="w-3 h-3" />
                      <span className="text-xs">ASC</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3 h-3" />
                      <span className="text-xs">DESC</span>
                    </>
                  )}
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeSort(index)}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add sort button */}
      {sorting.length < sortableFields.length && (
        <button
          type="button"
          onClick={addSort}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sort
        </button>
      )}
    </div>
  );
};

export default SortingConfig;
