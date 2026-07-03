import React, { useState, useMemo } from "react";
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
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type {
  KpiSegmentation,
  KpiSegmentationRequest,
} from "../../../types/kpi";

export const KpiSegmentationPage: React.FC = () => {
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
    if (confirm("Delete this segmentation record?")) {
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
              KPI Segmentation
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Breakdown KPI performance by dimension, department, and zone
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Segment
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by KPI code..."
            className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <select
          value={dimensionFilter}
          onChange={(e) => setDimensionFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Dimensions</option>
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
          placeholder="Year"
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
                Failed to load segmentation data
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Layers className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No segmentation data found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Add segmentation to break down KPI performance by dimension
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    KPI Code
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    Dimension
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    Segment
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    Dept/Zone
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    Target
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    Actual
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    %
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Actions
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
                        title="Delete"
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
            Add Segmentation
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                KPI Code
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
                <option value="">-- Select KPI --</option>
                {cardOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={formData.kpi_type}
                onChange={(e) =>
                  setFormData({ ...formData, kpi_type: e.target.value as any })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="strategic">Strategic</option>
                <option value="operational">Operational</option>
                <option value="award">Award</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Year
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
                Quarter
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
                Dimension
              </label>
              <input
                value={formData.dimension_name}
                onChange={(e) =>
                  setFormData({ ...formData, dimension_name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="e.g. Zone, Department, Category"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Segment
              </label>
              <input
                value={formData.segment_name}
                onChange={(e) =>
                  setFormData({ ...formData, segment_name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="e.g. Eastern Region, HR Dept"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Zone
              </label>
              <input
                value={formData.zone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, zone: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="e.g. Eastern Region"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target
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
                Achievement
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
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createSeg.isPending}>
              {createSeg.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
