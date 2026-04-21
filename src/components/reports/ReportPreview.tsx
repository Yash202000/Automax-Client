/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { ReportFieldDefinition } from "../../types";

interface ReportPreviewProps {
  data: Record<string, unknown>[];
  columns: { field: string; label: string }[];
  fields: ReportFieldDefinition[];
  isLoading: boolean;
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  // eslint-disable-next-line no-unused-vars
  onPageChange: (_page: number) => void;
}

// ── Shared label helper ──────────────────────────────────────────────────────

/**
 * Convert a raw field key to a human-readable label.
 * e.g. "incident_number" → "Incident Number"
 *      "current_state.name" → "Current State Name"
 *      "assignee.full_name" → "Assignee Full Name"
 *      "department_id"      → "Department"
 */
export const toHumanReadable = (key: string): string =>
  key
    .replace(/_id$/, "") // strip trailing _id → "department"
    .split(/[._]/) // split on dots and underscores
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// ── Styled cell helpers ──────────────────────────────────────────────────────

const getPriorityConfig = (
  t: any,
): Record<number, { label: string; bg: string; text: string }> => ({
  1: { label: t("priorities.critical"), bg: "#fee2e2", text: "#dc2626" },
  2: { label: t("priorities.high"), bg: "#ffedd5", text: "#ea580c" },
  3: { label: t("priorities.medium"), bg: "#fef9c3", text: "#ca8a04" },
  4: { label: t("priorities.low"), bg: "#dbeafe", text: "#2563eb" },
  5: { label: t("priorities.minimal"), bg: "#f3f4f6", text: "#6b7280" },
});

const Badge: React.FC<{ label: string; bg: string; text: string }> = ({
  label,
  bg,
  text,
}) => (
  <span
    style={{ backgroundColor: bg, color: text }}
    className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
  >
    {label}
  </span>
);

export const renderStyledCell = (
  value: unknown,
  field: ReportFieldDefinition,
  t: any,
): React.ReactNode => {
  const PRIORITY_CONFIG = getPriorityConfig(t);
  if (value === null || value === undefined || value === "") {
    return <span className="text-[hsl(var(--muted-foreground))]">—</span>;
  }

  // Priority
  if (field.field === "priority") {
    const cfg = PRIORITY_CONFIG[Number(value)];
    if (cfg) return <Badge {...cfg} />;
  }

  // Boolean / SLA
  if (field.type === "boolean") {
    const bool = value === true || value === "true" || value === 1;
    if (field.field === "sla_breached") {
      return bool ? (
        <Badge label={t("incidents.breached")} bg="#fee2e2" text="#dc2626" />
      ) : (
        <Badge label={t("incidents.onTrack")} bg="#d1fae5" text="#059669" />
      );
    }
    if (field.field === "is_active") {
      return bool ? (
        <Badge label={t("common.active")} bg="#d1fae5" text="#059669" />
      ) : (
        <Badge label={t("common.inactive")} bg="#f3f4f6" text="#6b7280" />
      );
    }
    return bool ? (
      <Badge label={t("common.yes")} bg="#d1fae5" text="#059669" />
    ) : (
      <Badge label={t("common.no")} bg="#f3f4f6" text="#6b7280" />
    );
  }

  // State type
  if (field.field === "current_state.state_type") {
    const STATE_COLORS: Record<string, { bg: string; text: string }> = {
      initial: { bg: "#dbeafe", text: "#2563eb" },
      normal: { bg: "#f3f4f6", text: "#374151" },
      terminal: { bg: "#d1fae5", text: "#059669" },
    };
    const colors = STATE_COLORS[String(value)] || {
      bg: "#f3f4f6",
      text: "#374151",
    };
    const label =
      field.options?.find(
        (o) => o.value === value || String(o.value) === String(value),
      )?.label || String(value);
    return <Badge label={label} {...colors} />;
  }

  // Action log status
  if (field.field === "status" && field.options) {
    const option = field.options.find(
      (o) => o.value === value || String(o.value) === String(value),
    );
    if (option) {
      const isSuccess = option.value === "success";
      return isSuccess ? (
        <Badge label={option.label} bg="#d1fae5" text="#059669" />
      ) : (
        <Badge label={option.label} bg="#fee2e2" text="#dc2626" />
      );
    }
  }

  // Enum — resolve label from options
  if (field.type === "enum" && field.options) {
    const option = field.options.find(
      (o) =>
        o.value === value ||
        String(o.value) === String(value) ||
        Number(o.value) === Number(value),
    );
    return <span>{option?.label || String(value)}</span>;
  }

  // Date / datetime
  if (field.type === "date" || field.type === "datetime") {
    try {
      const d = new Date(value as string);
      return (
        <span>
          {field.type === "date" ? d.toLocaleDateString() : d.toLocaleString()}
        </span>
      );
    } catch {
      return <span>{String(value)}</span>;
    }
  }

  // Number
  if (field.type === "number") {
    return (
      <span>
        {typeof value === "number" ? value.toLocaleString() : String(value)}
      </span>
    );
  }

  return <span>{String(value)}</span>;
};

// ── formatCellValue (string output — used by xlsx export) ────────────────────

export const formatCellValue = (
  value: unknown,
  field: ReportFieldDefinition,
  t: any,
): string => {
  const PRIORITY_CONFIG = getPriorityConfig(t);
  if (value === null || value === undefined || value === "") return "";

  if (field.field === "priority") {
    const cfg = PRIORITY_CONFIG[Number(value)];
    if (cfg) return cfg.label;
  }

  if (field.type === "boolean") {
    const bool = value === true || value === "true" || value === 1;
    if (field.field === "sla_breached")
      return bool ? t("incidents.breached") : t("incidents.onTrack");
    if (field.field === "is_active")
      return bool ? t("common.active") : t("common.inactive");
    return bool ? t("common.yes") : t("common.no");
  }

  if (field.type === "enum" && field.options) {
    const option = field.options.find(
      (o) =>
        o.value === value ||
        String(o.value) === String(value) ||
        Number(o.value) === Number(value),
    );
    return option?.label || String(value);
  }

  if (field.type === "date" || field.type === "datetime") {
    try {
      const d = new Date(value as string);
      return field.type === "date"
        ? d.toLocaleDateString()
        : d.toLocaleString();
    } catch {
      return String(value);
    }
  }

  if (field.type === "number") {
    return typeof value === "number" ? value.toLocaleString() : String(value);
  }

  return String(value) || "-";
};

// ── getNestedValue (shared) ──────────────────────────────────────────────────

export const getNestedValue = (
  obj: Record<string, unknown>,
  path: string,
): unknown => {
  if (path in obj) return obj[path];
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

// ── Component ────────────────────────────────────────────────────────────────

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

  // Never drop a column — fall back to a human-readable label if the field
  // definition is not found (e.g. relation fields returned differently by API)
  const columnDefs: ReportFieldDefinition[] = columns.map((col) => {
    const found = fields.find((f) => f.field === col.field);
    if (found) return { ...found, label: col.label };
    return {
      field: col.field,
      label: col.label,
      type: "string",
    } as ReportFieldDefinition;
  });

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
        <p className="text-[hsl(var(--muted-foreground))]">
          {t("reports.reportPreview.noDataFound")}
        </p>
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
          {t("reports.reportPreview.showing")} {startItem} - {endItem}{" "}
          {t("reports.reportPreview.of")} {totalItems.toLocaleString()}{" "}
          {t("reports.reportPreview.results")}
        </span>
        <span>
          {columns.length} {t("reports.reportPreview.columns")}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))]">
                {columnDefs.map((col) => (
                  <th
                    key={col.field}
                    className="px-5 py-4 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em] whitespace-nowrap rtl:text-right"
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
                  className="hover:bg-[hsl(var(--primary)/0.02)] transition-colors group/row"
                >
                  {columnDefs.map((col) => {
                    const value = getNestedValue(row, col.label);
                    return (
                      <td
                        key={col.field}
                        className="px-5 py-4 text-sm text-[hsl(var(--foreground))] whitespace-nowrap transition-colors group-hover/row:text-[hsl(var(--primary))] font-medium"
                      >
                        {renderStyledCell(value, col, t)}
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
            {t("reports.reportPreview.page")} {page}{" "}
            {t("reports.reportPreview.of")} {totalPages}
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
                        ? "bg-[hsl(var(--primary))] text-white"
                        : "hover:bg-[hsl(var(--muted))]"
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
