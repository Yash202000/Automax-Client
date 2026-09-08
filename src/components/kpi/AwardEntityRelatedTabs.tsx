import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  BarChart3,
  Users,
  Paperclip,
  Clock,
} from "lucide-react";
import type {
  AwardKPI,
  KpiCollaboratorAssignment,
  KpiEngagementEvidence,
} from "../../types/kpi";
import {
  formatFileSize,
  formatDateTime,
  isActiveAssignment,
  statusColorMap,
  usePagedSearch,
} from "../../utils/awardEntityRelated";

// Shared building blocks for the Award Criteria / Award Sub-Criteria "Related
// Details" pages (AwardCriterionDetailPage.tsx / AwardSubCriterionDetailPage.tsx)
// — both pages show the same 3 relationship tables (Related KPIs,
// Collaborators, Evidence) and the same Overview stat tiles, so that
// rendering lives here once instead of being duplicated per entity type.
// Non-component helpers (formatters, statusColorMap, usePagedSearch) live in
// utils/awardEntityRelated.ts — react-refresh/only-export-components requires
// this file to export components only.

export const TablePagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("kpi.dictionary.pageOf", { current: page, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rtl:-rotate-180" />
          {t("common.previous")}
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("common.next")}
          <ChevronRight className="w-4 h-4 rtl:-rotate-180" />
        </button>
      </div>
    </div>
  );
};

export const TableSearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
}> = ({ value, onChange, placeholder, resultCount, totalCount }) => {
  const { t } = useTranslation();
  return (
    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-80"
        />
      </div>
      {value.trim() && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("kpi.dictionary.pageOf", {
            current: resultCount,
            total: totalCount,
          })}
        </p>
      )}
    </div>
  );
};

export const StatTiles: React.FC<{
  totalKpis: number;
  totalCollaborators: number;
  totalEvidence: number;
  lastUpdated?: string;
}> = ({ totalKpis, totalCollaborators, totalEvidence, lastUpdated }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.masterData.totalKpis")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalKpis}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.masterData.totalCollaborators")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalCollaborators}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Paperclip className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.masterData.totalEvidence")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalEvidence}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10">
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.masterData.lastUpdated")}
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-white truncate">
              {formatDateTime(lastUpdated)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RelatedKpisTable: React.FC<{
  kpis: AwardKPI[];
  loading: boolean;
}> = ({ kpis, loading }) => {
  const { t } = useTranslation();
  const paged = usePagedSearch<AwardKPI>(kpis, (kpi, q) =>
    [kpi.code, kpi.name_en, kpi.description_en]
      .filter(Boolean)
      .some((f) => f!.toLowerCase().includes(q)),
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
      <TableSearchBar
        value={paged.search}
        onChange={paged.setSearch}
        placeholder={t("kpi.masterData.searchKpisPlaceholder")}
        resultCount={paged.filteredCount}
        totalCount={kpis.length}
      />
      {loading ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("common.loading")}
        </p>
      ) : kpis.length === 0 ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.masterData.noLinkedKpis")}
        </p>
      ) : paged.filteredCount === 0 ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.masterData.noSearchResults")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.kpiId")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.kpiName")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.kpiDescription")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.evidenceStatus")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.kpiFrequency")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.kpiOwner")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map((kpi) => {
                  const owner =
                    kpi.owner_dept?.name ??
                    kpi.owner_org?.name_en ??
                    kpi.owning_agency?.name ??
                    (kpi.created_by
                      ? `${kpi.created_by.first_name} ${kpi.created_by.last_name}`.trim()
                      : "-");
                  return (
                    <tr
                      key={kpi.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <Link
                          to={`/goals/kpi/dictionary/award/${kpi.id}`}
                          className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {kpi.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {kpi.name_en}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {kpi.description_en || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            statusColorMap[kpi.activation_status] ??
                            statusColorMap.draft
                          }`}
                        >
                          {kpi.activation_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 capitalize whitespace-nowrap">
                        {kpi.reporting_frequency}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {owner}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={paged.page}
            totalPages={paged.totalPages}
            onPageChange={paged.setPage}
          />
        </>
      )}
    </div>
  );
};

export const RelatedCollaboratorsTable: React.FC<{
  collaborators: KpiCollaboratorAssignment[];
  loading: boolean;
}> = ({ collaborators, loading }) => {
  const { t } = useTranslation();
  const paged = usePagedSearch<KpiCollaboratorAssignment>(
    collaborators,
    (c, q) =>
      [
        c.user ? `${c.user.first_name} ${c.user.last_name}` : "",
        c.collaborator_type,
        c.user?.department?.name ?? "",
      ]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q)),
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
      <TableSearchBar
        value={paged.search}
        onChange={paged.setSearch}
        placeholder={t("kpi.masterData.searchCollaboratorsPlaceholder")}
        resultCount={paged.filteredCount}
        totalCount={collaborators.length}
      />
      {loading ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("common.loading")}
        </p>
      ) : collaborators.length === 0 ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.masterData.noLinkedCollaborators")}
        </p>
      ) : paged.filteredCount === 0 ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.masterData.noSearchResults")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.collaboratorName")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.collaboratorRole")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.collaboratorDepartment")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.evidenceStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map((c) => {
                  const active = isActiveAssignment(c);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {c.user
                          ? `${c.user.first_name} ${c.user.last_name}`.trim()
                          : c.user_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {c.collaborator_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {c.user?.department?.name ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            active
                              ? statusColorMap.active
                              : statusColorMap.inactive
                          }`}
                        >
                          {active ? t("common.active") : t("common.inactive")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={paged.page}
            totalPages={paged.totalPages}
            onPageChange={paged.setPage}
          />
        </>
      )}
    </div>
  );
};

export const RelatedEvidenceTable: React.FC<{
  evidence: KpiEngagementEvidence[];
  loading: boolean;
  onView: (evidenceId: string) => void;
  viewPending: boolean;
  onDownload: (args: { evidenceId: string; fileName: string }) => void;
  downloadPending: boolean;
}> = ({
  evidence,
  loading,
  onView,
  viewPending,
  onDownload,
  downloadPending,
}) => {
  const { t } = useTranslation();
  const paged = usePagedSearch(evidence, (e, q) =>
    [e.file_name, e.title, e.evidence_type]
      .filter(Boolean)
      .some((f) => f!.toLowerCase().includes(q)),
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
      <TableSearchBar
        value={paged.search}
        onChange={paged.setSearch}
        placeholder={t("kpi.masterData.searchEvidencePlaceholder")}
        resultCount={paged.filteredCount}
        totalCount={evidence.length}
      />
      {loading ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("common.loading")}
        </p>
      ) : evidence.length === 0 ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.masterData.noLinkedEvidence")}
        </p>
      ) : paged.filteredCount === 0 ? (
        <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.masterData.noSearchResults")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.evidenceFileName")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.evidenceDateAdded")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.evidenceAddedBy")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.evidenceFileSize")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.masterData.evidenceStatus")}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map((e) => {
                  const hasFile = !!e.file_name;
                  const addedBy = e.uploaded_by
                    ? `${e.uploaded_by.first_name} ${e.uploaded_by.last_name}`.trim()
                    : "-";
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        <p className="font-medium text-slate-900 dark:text-white truncate max-w-xs">
                          {e.file_name ?? e.title}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {addedBy}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatFileSize(e.file_size)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                          {e.evidence_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {hasFile ? (
                            <button
                              onClick={() => onView(e.id)}
                              disabled={viewPending}
                              title={t("common.view")}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/20 transition-colors disabled:opacity-50"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            e.file_url && (
                              <a
                                href={e.file_url}
                                target="_blank"
                                rel="noreferrer"
                                title={t("common.view")}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/20 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )
                          )}
                          {hasFile && (
                            <button
                              onClick={() =>
                                onDownload({
                                  evidenceId: e.id,
                                  fileName: e.file_name!,
                                })
                              }
                              disabled={downloadPending}
                              title={t("common.download")}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={paged.page}
            totalPages={paged.totalPages}
            onPageChange={paged.setPage}
          />
        </>
      )}
    </div>
  );
};
