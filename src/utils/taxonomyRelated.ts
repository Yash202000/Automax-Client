import { useState } from "react";
import type { KpiCollaboratorAssignment } from "../types/kpi";

// Shared, non-component helpers for the taxonomy "Related Details" pages
// (Award Criteria / Award Sub-Criteria / Operational Objective detail pages)
// — split out of TaxonomyRelatedTabs.tsx because mixing component and
// non-component exports in one file breaks React Fast Refresh
// (react-refresh/only-export-components).

export const PAGE_SIZE = 10;

export const formatFileSize = (bytes?: number) => {
  if (bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDateTime = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Mirrors CollaboratorsTab.tsx's isActiveAssignment: an assignment is only
// "Active" when its is_active flag is set AND today falls within its
// effective date range.
export const isActiveAssignment = (a: KpiCollaboratorAssignment) => {
  const now = new Date();
  const effFrom = new Date(a.effective_from);
  if (effFrom > now) return false;
  if (a.effective_to && new Date(a.effective_to) < now) return false;
  return a.is_active;
};

// Mirrors KpiDictionaryPage.tsx's statusColorMap for the KPI Workflow's 5 states.
export const statusColorMap: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

// Generic client-side search + pagination — mirrors KpiDictionaryPage.tsx's
// own PAGE_SIZE/search/page pattern (this app's established way of keeping
// admin lists usable at scale without server-side pagination).
export function usePagedSearch<T>(
  items: T[],
  matches: (item: T, query: string) => boolean,
  pageSize: number = PAGE_SIZE,
) {
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(1);

  const filtered = search.trim()
    ? items.filter((item) => matches(item, search.trim().toLowerCase()))
    : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const setSearch = (value: string) => {
    setSearchState(value);
    setPage(1);
  };

  return {
    search,
    setSearch,
    page: safePage,
    setPage,
    totalPages,
    pageItems,
    filteredCount: filtered.length,
  };
}
