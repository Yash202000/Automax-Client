import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IncidentsPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Feed pagination:
 *  [<<] [<] [1] [2] [3] [4] [5] [...] [3100] [>] [>>]
 *  1 - 10 of 61,995
 * Pinned LAST in the feed panel — never scrolls with the cards.
 */
export function IncidentsPagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
}: IncidentsPaginationProps) {
  const { t } = useTranslation();
  const safeTotal = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), safeTotal);

  const window_: (number | "...")[] = useMemo(() => {
    if (safeTotal <= 7) {
      return Array.from({ length: safeTotal }, (_, i) => i + 1);
    }
    if (current <= 4) return [1, 2, 3, 4, 5, "...", safeTotal];
    if (current >= safeTotal - 3)
      return [
        1,
        "...",
        safeTotal - 4,
        safeTotal - 3,
        safeTotal - 2,
        safeTotal - 1,
        safeTotal,
      ];
    return [1, "...", current - 1, current, current + 1, "...", safeTotal];
  }, [current, safeTotal]);

  const start = totalItems === 0 ? 0 : (current - 1) * limit + 1;
  const end = Math.min(current * limit, totalItems);

  const navBtn =
    "w-6 h-6 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-40 disabled:pointer-events-none transition-colors";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={navBtn}
          disabled={current <= 1}
          onClick={() => onPageChange(1)}
          aria-label={t("common.first")}
        >
          <ChevronsLeft className="h-3 w-3 rtl:rotate-180" />
        </button>
        <button
          type="button"
          className={navBtn}
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          aria-label={t("common.previous")}
        >
          <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        </button>

        {window_.map((p, i) =>
          p === "..." ? (
            <span
              key={`e-${i}`}
              className="text-[hsl(var(--muted-foreground))] text-xs px-0.5 font-mono"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === current ? "page" : undefined}
              className={cn(
                "h-6 min-w-6 px-1 flex items-center justify-center rounded font-mono text-xs transition-colors",
                p === current
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          className={navBtn}
          disabled={current >= safeTotal}
          onClick={() => onPageChange(current + 1)}
          aria-label={t("common.next")}
        >
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </button>
        <button
          type="button"
          className={navBtn}
          disabled={current >= safeTotal}
          onClick={() => onPageChange(safeTotal)}
          aria-label={t("common.last")}
        >
          <ChevronsRight className="h-3 w-3 rtl:rotate-180" />
        </button>
      </div>
      <div
        className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono"
        aria-live="polite"
      >
        {formatCount(start)} - {formatCount(end)} {t("common.of")}{" "}
        {formatCount(totalItems)}
      </div>
    </div>
  );
}

export default IncidentsPagination;
