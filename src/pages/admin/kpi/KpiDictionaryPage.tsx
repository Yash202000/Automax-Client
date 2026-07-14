import React, { useState } from "react";
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
  Target,
  TrendingUp,
  Award,
} from "lucide-react";
import {
  useStrategicKPIs,
  useOperationalKPIs,
  useAwardKPIs,
} from "../../../hooks/useKpi";
import { KpiCard } from "../../../components/kpi/KpiCard";
import type {
  PaginatedResponse,
  StrategicKPI,
  OperationalKPI,
  AwardKPI,
} from "../../../types/kpi";

type DictTab = "strategic" | "operational" | "award";

export const KpiDictionaryPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DictTab>("strategic");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const limit = 10;

  const strategicQuery = useStrategicKPIs(
    activeTab === "strategic"
      ? { page, limit, search: search || undefined }
      : undefined,
  );
  const operationalQuery = useOperationalKPIs(
    activeTab === "operational"
      ? { page, limit, search: search || undefined }
      : undefined,
  );
  const awardQuery = useAwardKPIs(
    activeTab === "award" ? { page, limit } : undefined,
  );

  const currentQuery = {
    strategic: strategicQuery,
    operational: operationalQuery,
    award: awardQuery,
  }[activeTab];

  const data = (currentQuery.data as PaginatedResponse<any>) ?? {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
  };
  const items = data.data ?? [];
  const total = data.total_items ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const tabs: { key: DictTab; label: string }[] = [
    { key: "strategic", label: t("kpi.dictionary.strategic") },
    { key: "operational", label: t("kpi.dictionary.operational") },
    { key: "award", label: t("kpi.dictionary.award") },
  ];

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

      {/* Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
                setSearch("");
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
        {activeTab !== "award" && (
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={t("kpi.dictionary.searchPlaceholder")}
              className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        )}
      </div>

      {/* Cards */}
      <div>
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80">
            <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("kpi.dictionary.empty")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((kpi: StrategicKPI | OperationalKPI | AwardKPI) => (
                <KpiCard key={kpi.id} kpi={kpi} type={activeTab} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 flex items-center justify-between">
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
