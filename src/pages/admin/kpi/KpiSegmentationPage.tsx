import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";
import {
  useKpiSegmentations,
  useCreateKpiSegmentation,
  useDeleteKpiSegmentation,
  useKpiCardDefinitions,
  useSegmentationDimensions,
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type {
  KpiSegmentation,
  KpiSegmentationRequest,
} from "../../../types/kpi";

export const KpiSegmentationPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dimensionFilter, setDimensionFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const params = useMemo(
    () => ({
      kpi_code: search || undefined,
      dimension: dimensionFilter || undefined,
      year: yearFilter ? Number(yearFilter) : undefined,
    }),
    [search, dimensionFilter, yearFilter],
  );

  const { data: segmentations, isLoading, error } = useKpiSegmentations(params);
  const { data: allCards } = useKpiCardDefinitions();
  const { data: segmentationDimensionsData } = useSegmentationDimensions();
  const segmentationDimensions = segmentationDimensionsData ?? [];
  const cardOptions = (allCards ?? []).map((c) => ({
    code: c.code,
    label: `${c.code} — ${c.name_en}`,
    type: c.type,
  }));
  const createSeg = useCreateKpiSegmentation();
  const deleteSeg = useDeleteKpiSegmentation();

  const items = segmentations ?? [];

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<KpiSegmentationRequest>({
    kpi_code: "",
    kpi_type: "strategic",
    year: new Date().getFullYear(),
    quarter: 1,
    dimension_name: "",
    segment_name: "",
    target: 0,
    achievement: 0,
    zone: "",
  });

  const handleCreate = async () => {
    await createSeg.mutateAsync(formData);
    setShowForm(false);
    setFormData({
      kpi_code: "",
      kpi_type: "strategic",
      year: new Date().getFullYear(),
      quarter: 1,
      dimension_name: "",
      segment_name: "",
      target: 0,
      achievement: 0,
      zone: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("kpi.segmentation.deleteConfirm"))) {
      await deleteSeg.mutateAsync(id);
    }
  };

  const dimensions = Array.from(
    new Set(items.map((s) => s.dimension_name).filter(Boolean)),
  );

  const getPctColor = (pct: number) => {
    if (pct >= 100) return "text-green-600 dark:text-green-400";
    if (pct >= 80) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.segmentation.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.segmentation.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          {t("kpi.segmentation.addSegment")}
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("kpi.segmentation.searchPlaceholder")}
            className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <select
          value={dimensionFilter}
          onChange={(e) => setDimensionFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("kpi.segmentation.allDimensions")}</option>
          {dimensions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          placeholder={t("kpi.targets.table.year")}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {t("kpi.segmentation.failedToLoad")}
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Layers className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("kpi.segmentation.empty")}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t("kpi.segmentation.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.kpiCode")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.period")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.segmentation.dimension")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.segmentation.segment")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.segmentation.deptZone")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.target")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.actual")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    %
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((s: KpiSegmentation) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
                      {s.kpi_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      Q{s.quarter} / {s.year}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {s.dimension_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {s.segment_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {s.zone && <span className="mr-1">{s.zone}</span>}
                      {s.department?.name && <span>({s.department.name})</span>}
                      {!s.zone && !s.department?.name && "-"}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-right text-slate-700 dark:text-slate-300">
                      {s.target ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-right text-slate-700 dark:text-slate-300">
                      {s.achievement ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm tabular-nums font-medium ${getPctColor(s.achievement_pct)}`}
                      >
                        {s.achievement_pct?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="lg">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.segmentation.addSegment")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.targets.form.kpiCode")}
              </label>
              <select
                value={formData.kpi_code}
                onChange={(e) => {
                  const selected = cardOptions.find(
                    (c) => c.code === e.target.value,
                  );
                  setFormData({
                    ...formData,
                    kpi_code: e.target.value,
                    kpi_type: (selected?.type as any) ?? formData.kpi_type,
                  });
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- {t("kpi.targets.form.kpiCode")} --</option>
                {cardOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.targets.form.kpiType")}
              </label>
              <select
                value={formData.kpi_type}
                onChange={(e) =>
                  setFormData({ ...formData, kpi_type: e.target.value as any })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="strategic">
                  {t("kpi.dictionary.strategic")}
                </option>
                <option value="operational">
                  {t("kpi.dictionary.operational")}
                </option>
                <option value="award">{t("kpi.dictionary.award")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.targets.table.year")}
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.segmentation.quarter")}
              </label>
              <select
                value={formData.quarter}
                onChange={(e) =>
                  setFormData({ ...formData, quarter: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.segmentation.dimension")}
              </label>
              <select
                value={formData.dimension_name}
                onChange={(e) =>
                  setFormData({ ...formData, dimension_name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">
                  -- {t("kpi.segmentation.dimension")} --
                </option>
                {segmentationDimensions.map((d: any) => (
                  <option key={d.id} value={d.name_en}>
                    {d.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.segmentation.segment")}
              </label>
              <input
                value={formData.segment_name}
                onChange={(e) =>
                  setFormData({ ...formData, segment_name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder={t("kpi.segmentation.segmentPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.segmentation.zone")}
              </label>
              <input
                value={formData.zone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, zone: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder={t("kpi.segmentation.zonePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.performance.table.target")}
              </label>
              <input
                type="number"
                value={formData.target || 0}
                onChange={(e) =>
                  setFormData({ ...formData, target: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.segmentation.achievement")}
              </label>
              <input
                type="number"
                value={formData.achievement || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    achievement: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createSeg.isPending}>
              {createSeg.isPending ? "..." : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
