import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Target,
  TrendingUp,
  Award,
  Pencil,
  Crosshair,
} from "lucide-react";
import {
  useStrategicKPIs,
  useOperationalKPIs,
  useAwardKPIs,
} from "../../../hooks/useKpi";
import { usePermissions } from "../../../hooks/usePermissions";
import type {
  PaginatedResponse,
  StrategicKPI,
  OperationalKPI,
  AwardKPI,
} from "../../../types/kpi";

type DictTab = "strategic" | "operational" | "award";
type KpiRow = StrategicKPI | OperationalKPI | AwardKPI;
type SortField =
  | "code"
  | "name_en"
  | "activation_status"
  | "reporting_frequency"
  | "baseline";
type SortDir = "asc" | "desc";

const statusColorMap: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

// Fetched in one large page and then filtered/sorted/paginated client-side —
// KPI counts per type are small enough that this is simpler and more capable
// (full-dataset search/filter/sort) than round-tripping every interaction to
// the server.
const FETCH_LIMIT = 200;
const PAGE_SIZE = 10;

export const KpiDictionaryPage: React.FC = () => {
  const { t } = useTranslation();
  const { canUpdateKpi } = usePermissions();
  const [activeTab, setActiveTab] = useState<DictTab>("strategic");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  const strategicQuery = useStrategicKPIs(
    activeTab === "strategic" ? { page: 1, limit: FETCH_LIMIT } : undefined,
  );
  const operationalQuery = useOperationalKPIs(
    activeTab === "operational" ? { page: 1, limit: FETCH_LIMIT } : undefined,
  );
  const awardQuery = useAwardKPIs(
    activeTab === "award" ? { page: 1, limit: FETCH_LIMIT } : undefined,
  );

  const currentQuery = {
    strategic: strategicQuery,
    operational: operationalQuery,
    award: awardQuery,
  }[activeTab];

  const allItems = useMemo(() => {
    const data = (currentQuery.data as PaginatedResponse<KpiRow>) ?? {
      data: [],
    };
    return data.data ?? [];
  }, [currentQuery.data]);

  const filteredItems = useMemo(() => {
    let rows = allItems;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name_en.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      rows = rows.filter((r) => r.activation_status === statusFilter);
    }
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [allItems, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (field !== sortField)
      return (
        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
      );
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
    );
  };

  const tabs: { key: DictTab; label: string }[] = [
    { key: "strategic", label: t("kpi.dictionary.strategic") },
    { key: "operational", label: t("kpi.dictionary.operational") },
    { key: "award", label: t("kpi.dictionary.award") },
  ];

  const getGoalTitle = (kpi: KpiRow) => (kpi as any).goal?.title ?? "-";
  const getObjective = (kpi: KpiRow) => {
    const objectiveName =
      (kpi as any).operational_objective?.name_en ??
      (kpi as any).process?.operational_objective?.name_en;
    const childName = (kpi as any).process?.name_en;
    return [objectiveName, childName].filter(Boolean).join(" › ") || "-";
  };
  const editHref = (kpi: KpiRow) =>
    activeTab === "strategic"
      ? `/goals/kpi/dictionary/${kpi.id}/edit`
      : `/goals/kpi/dictionary/${activeTab}/${kpi.id}/edit`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.dictionary.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.dictionary.subtitle")}
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setNewMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("kpi.dictionary.newKpi")}
            <ChevronDown className="w-4 h-4" />
          </button>
          {newMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNewMenuOpen(false)}
              />
              <div className="absolute end-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-20 overflow-hidden">
                <Link
                  to="/goals/kpi/dictionary/new"
                  onClick={() => setNewMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <Target size={18} className="text-blue-500" />
                  <div>
                    <p className="font-medium">Strategic KPI</p>
                    <p className="text-xs text-slate-400">
                      Linked to strategic goals
                    </p>
                  </div>
                </Link>
                <Link
                  to="/goals/kpi/dictionary/new/operational"
                  onClick={() => setNewMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700"
                >
                  <TrendingUp size={18} className="text-green-500" />
                  <div>
                    <p className="font-medium">Operational KPI</p>
                    <p className="text-xs text-slate-400">
                      Linked to processes
                    </p>
                  </div>
                </Link>
                <Link
                  to="/goals/kpi/dictionary/new/award"
                  onClick={() => setNewMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700"
                >
                  <Award size={18} className="text-purple-500" />
                  <div>
                    <p className="font-medium">Award KPI</p>
                    <p className="text-xs text-slate-400">
                      Linked to award criteria
                    </p>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs + Search + Filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
                setSearch("");
                setStatusFilter("");
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("kpi.dictionary.searchPlaceholder")}
              className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {currentQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : currentQuery.error ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {t("kpi.dictionary.failedToLoad")}
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {allItems.length === 0
                ? t("kpi.dictionary.empty")
                : "No KPIs match your search/filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th
                      onClick={() => handleSort("code")}
                      className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {t("kpi.dictionary.table.code")}
                        <SortIcon field="code" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("name_en")}
                      className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {t("kpi.dictionary.table.name")}
                        <SortIcon field="name_en" />
                      </span>
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Goal
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Objective
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Data Source
                    </th>
                    <th
                      onClick={() => handleSort("activation_status")}
                      className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {t("kpi.dictionary.table.status")}
                        <SortIcon field="activation_status" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("reporting_frequency")}
                      className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {t("kpi.dictionary.table.frequency")}
                        <SortIcon field="reporting_frequency" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("baseline")}
                      className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {t("kpi.dictionary.table.baseline")}
                        <SortIcon field="baseline" />
                      </span>
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((kpi) => (
                    <tr
                      key={kpi.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/goals/kpi/dictionary/${activeTab}/${kpi.id}`}
                          className="text-sm font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {kpi.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/goals/kpi/dictionary/${activeTab}/${kpi.id}`}
                          className="text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {kpi.name_en}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-[180px] truncate">
                        {getGoalTitle(kpi)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-[220px] truncate">
                        {getObjective(kpi)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {kpi.data_source || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            statusColorMap[kpi.activation_status] ??
                            statusColorMap.draft
                          }`}
                        >
                          {kpi.activation_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 capitalize">
                        {kpi.reporting_frequency}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                        {kpi.baseline}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/goals/kpi/targets?kpi_code=${encodeURIComponent(kpi.code)}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                            title="Targets"
                          >
                            <Crosshair className="w-4 h-4" />
                          </Link>
                          {canUpdateKpi() && (
                            <Link
                              to={editHref(kpi)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("kpi.dictionary.pageOf", {
                  current: page,
                  total: totalPages,
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 rtl:-rotate-180" />
                  {t("common.previous")}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("common.next")}
                  <ChevronRight className="w-4 h-4 rtl:-rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
