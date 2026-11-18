import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Share2 } from "lucide-react";
import { Button } from "../ui";

interface IncidentSelectionBarProps {
  count: number;
  onClear: () => void;
  /** Show the Share PDF action (user can view incidents). */
  canShare: boolean;
  onShare: () => void;
  /** Bulk action buttons, rendered after Share in a fixed order. */
  children?: ReactNode;
  /** Short one-line warning shown under the bar. */
  warning?: string | null;
  /** Full reason, shown on hover of the warning. */
  warningDetail?: string;
}

/** Action bar shown on top of an incidents table while rows are selected. */
export function IncidentSelectionBar({
  count,
  onClear,
  canShare,
  onShare,
  children,
  warning,
  warningDetail,
}: IncidentSelectionBarProps) {
  const { t } = useTranslation();
  if (count === 0) return null;

  return (
    <div className="border-b border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary))]">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[hsl(var(--primary))] px-2 text-xs text-[hsl(var(--primary-foreground))] tabular-nums">
            {count}
          </span>
          {t("common.selected")}
          <button
            type="button"
            onClick={onClear}
            className="ms-1 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
          >
            {t("common.clear")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canShare && (
            <Button
              size="xs"
              onClick={onShare}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
            >
              {t("incidents.sharePdf")}
            </Button>
          )}
          {canShare && children ? (
            <span className="mx-0.5 h-5 w-px bg-[hsl(var(--primary)/0.25)]" />
          ) : null}
          {children}
        </div>
      </div>
      {warning ? (
        <div
          role="status"
          title={warningDetail}
          className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="truncate">{warning}</span>
        </div>
      ) : null}
    </div>
  );
}
