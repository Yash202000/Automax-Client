import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { ReportFieldDefinition } from '../../types';

interface ReportPreviewProps {
  data: Record<string, unknown>[];
  columns: string[];
  fields: ReportFieldDefinition[];
  isLoading: boolean;
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  data,
  columns,
  fields,
  isLoading,
  page,
  limit,
  totalItems,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();

  // Get field definitions for selected columns
  const columnDefs = columns
    .map((col) => fields.find((f) => f.field === col))
    .filter(Boolean) as ReportFieldDefinition[];

  // Format cell value based on field type
  const formatCellValue = (value: unknown, field: ReportFieldDefinition): string => {
    if (value === null || value === undefined || value === '') return '-';

    switch (field.type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        try {
          return new Date(value as string).toLocaleDateString();
        } catch {
          return String(value);
        }
      case 'datetime':
        try {
          return new Date(value as string).toLocaleString();
        } catch {
          return String(value);
        }
      case 'enum':
        // Handle both string and number comparisons for enum values
        const option = field.options?.find((o) =>
          o.value === value ||
          String(o.value) === String(value) ||
          Number(o.value) === Number(value)
        );
        return option?.label || String(value);
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        // Return '-' for empty strings as well
        return String(value) || '-';
    }
  };

  // Get nested value from object (e.g., "assignee.username")
  // Supports both flat keys ("assignee.username") and nested objects ({assignee: {username: ...}})
  const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
    // First check if the full path exists as a flat key
    if (path in obj) {
      return obj[path];
    }

    // Fall back to nested object traversal
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[hsl(var(--muted-foreground))]">{t('reports.reportPreview.noDataFound')}</p>
      </div>
    );
  }

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  return (
    <div className="space-y-4">
      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))]">
        <span>
          {t('reports.reportPreview.showing')} {startItem} - {endItem} {t('reports.reportPreview.of')} {totalItems.toLocaleString()} {t('reports.reportPreview.results')}
        </span>
        <span>{columns.length} {t('reports.reportPreview.columns')}</span>
      </div>

      {/* Table */}
      <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))]">
                {columnDefs.map((col) => (
                  <th
                    key={col.field}
                    className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors"
                >
                  {columnDefs.map((col) => {
                    const value = getNestedValue(row, col.field);
                    return (
                      <td
                        key={col.field}
                        className="px-4 py-3 text-sm text-[hsl(var(--foreground))] whitespace-nowrap"
                      >
                        {formatCellValue(value, col)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            {t('reports.reportPreview.page')} {page} {t('reports.reportPreview.of')} {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => onPageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'hover:bg-[hsl(var(--muted))]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPreview;
