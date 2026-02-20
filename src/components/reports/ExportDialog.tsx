import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, FileSpreadsheet, FileText, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui';
import type { ReportFieldDefinition } from '../../types';
import { renderStyledCell, getNestedValue, toHumanReadable } from './ReportPreview';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'xlsx' | 'pdf', options: ExportOptions) => Promise<void>;
  isExporting: boolean;
  dataSourceLabel: string;
  recordCount: number;
  // Preview data
  previewData?: Record<string, unknown>[];
  columns?: string[];
  fields?: ReportFieldDefinition[];
}

interface ExportOptions {
  title: string;
  includeFilters: boolean;
  includeTimestamp: boolean;
}

const PREVIEW_ROWS = 5;

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  isExporting,
  dataSourceLabel,
  recordCount,
  previewData = [],
  columns = [],
  fields = [],
}) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [title, setTitle] = useState(`${dataSourceLabel} Report`);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  const handleExport = async () => {
    await onExport(format, { title, includeFilters, includeTimestamp });
  };

  if (!isOpen) return null;

  // Build column definitions — always produce a label, never drop a column
  const columnDefs: ReportFieldDefinition[] = columns.map((col) => {
    const found = fields.find((f) => f.field === col);
    if (found) return found;
    return { field: col, label: toHumanReadable(col), type: 'string' } as ReportFieldDefinition;
  });

  const previewRows = previewData.slice(0, PREVIEW_ROWS);
  const hasPreview = previewRows.length > 0 && columnDefs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog — wider to accommodate preview table */}
      <div className={cn(
        "relative bg-[hsl(var(--card))] rounded-xl shadow-xl w-full overflow-hidden flex flex-col",
        hasPreview ? "max-w-5xl max-h-[90vh]" : "max-w-md"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Download className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {t('reports.exportDialog.title')}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {recordCount.toLocaleString()} {t('reports.exportDialog.records')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1">
          {hasPreview ? (
            /* Two-column layout when preview is available */
            <div className="flex flex-col lg:flex-row min-h-0">
              {/* Left: options */}
              <div className="lg:w-72 shrink-0 px-6 py-4 space-y-4 border-b lg:border-b-0 lg:border-r border-[hsl(var(--border))]">
                {/* Format selection */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('reports.exportDialog.exportFormat')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('xlsx')}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        format === 'xlsx'
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                      )}
                    >
                      <FileSpreadsheet className={cn(
                        "w-6 h-6",
                        format === 'xlsx' ? "text-green-600" : "text-[hsl(var(--muted-foreground))]"
                      )} />
                      <div className="text-left">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {t('reports.exportDialog.excel')}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t('reports.exportDialog.xlsxFormat')}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('pdf')}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        format === 'pdf'
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                      )}
                    >
                      <FileText className={cn(
                        "w-6 h-6",
                        format === 'pdf' ? "text-red-600" : "text-[hsl(var(--muted-foreground))]"
                      )} />
                      <div className="text-left">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {t('reports.exportDialog.pdf')}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t('reports.exportDialog.pdfFormat')}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    {t('reports.exportDialog.reportTitle')}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('reports.exportDialog.reportTitlePlaceholder')}
                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                  />
                </div>

                {/* Options */}
                <div className="space-y-1">
                  <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={includeFilters}
                      onChange={(e) => setIncludeFilters(e.target.checked)}
                      className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t('reports.exportDialog.includeFilterSummary')}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t('reports.exportDialog.includeFilterSummaryDesc')}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={includeTimestamp}
                      onChange={(e) => setIncludeTimestamp(e.target.checked)}
                      className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t('reports.exportDialog.includeTimestamp')}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t('reports.exportDialog.includeTimestampDesc')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Right: data preview */}
              <div className="flex-1 px-6 py-4 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Data Preview
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    — first {previewRows.length} of {recordCount.toLocaleString()} records
                  </span>
                </div>

                <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))]">
                          {columnDefs.map((col) => (
                            <th
                              key={col.field}
                              className="px-3 py-2.5 text-left text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider whitespace-nowrap"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]">
                        {previewRows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? '' : 'bg-[hsl(var(--muted)/0.15)]'}
                          >
                            {columnDefs.map((col) => {
                              const value = getNestedValue(row, col.field);
                              return (
                                <td
                                  key={col.field}
                                  className="px-3 py-2 text-[hsl(var(--foreground))] whitespace-nowrap"
                                >
                                  {renderStyledCell(value, col)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {recordCount > PREVIEW_ROWS && (
                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    + {(recordCount - PREVIEW_ROWS).toLocaleString()} more records will be included in the download.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Single-column layout when no preview data */
            <div className="px-6 py-4 space-y-4">
              {/* Format selection */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t('reports.exportDialog.exportFormat')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat('xlsx')}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      format === 'xlsx'
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                    )}
                  >
                    <FileSpreadsheet className={cn(
                      "w-8 h-8",
                      format === 'xlsx' ? "text-green-600" : "text-[hsl(var(--muted-foreground))]"
                    )} />
                    <div className="ltr:text-left rtl:text-right">
                      <p className="font-medium text-[hsl(var(--foreground))]">
                        {t('reports.exportDialog.excel')}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t('reports.exportDialog.xlsxFormat')}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('pdf')}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      format === 'pdf'
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                    )}
                  >
                    <FileText className={cn(
                      "w-8 h-8",
                      format === 'pdf' ? "text-red-600" : "text-[hsl(var(--muted-foreground))]"
                    )} />
                    <div className="ltr:text-left rtl:text-right">
                      <p className="font-medium text-[hsl(var(--foreground))]">
                        {t('reports.exportDialog.pdf')}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t('reports.exportDialog.pdfFormat')}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  {t('reports.exportDialog.reportTitle')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('reports.exportDialog.reportTitlePlaceholder')}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeFilters}
                    onChange={(e) => setIncludeFilters(e.target.checked)}
                    className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t('reports.exportDialog.includeFilterSummary')}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t('reports.exportDialog.includeFilterSummaryDesc')}
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeTimestamp}
                    onChange={(e) => setIncludeTimestamp(e.target.checked)}
                    className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                  />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t('reports.exportDialog.includeTimestamp')}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t('reports.exportDialog.includeTimestampDesc')}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            {t('reports.exportDialog.cancel')}
          </Button>
          <Button
            onClick={handleExport}
            isLoading={isExporting}
            leftIcon={!isExporting ? <Download className="w-4 h-4" /> : undefined}
          >
            {isExporting
              ? t('reports.exportDialog.exporting')
              : `Download ${format.toUpperCase()}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
