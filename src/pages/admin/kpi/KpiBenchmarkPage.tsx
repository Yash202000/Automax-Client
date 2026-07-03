import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  useKpiBenchmarks,
  useCreateKpiBenchmark,
  useDeleteKpiBenchmark,
  useKpiCardDefinitions,
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type { KpiBenchmark, KpiBenchmarkRequest } from "../../../types/kpi";

export const KpiBenchmarkPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const params = useMemo(
    () => ({
      kpi_code: search || undefined,
      zone: zoneFilter || undefined,
      year: yearFilter ? Number(yearFilter) : undefined,
    }),
    [search, zoneFilter, yearFilter],
  );

  const { data: benchmarks, isLoading, error } = useKpiBenchmarks(params);
  const { data: allCards } = useKpiCardDefinitions();
  const cardOptions = (allCards ?? []).map((c) => ({
    code: c.code,
    label: `${c.code} — ${c.name_en}`,
    type: c.type,
  }));
  const createBenchmark = useCreateKpiBenchmark();
  const deleteBenchmark = useDeleteKpiBenchmark();

  const items = benchmarks ?? [];

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<KpiBenchmarkRequest>({
    kpi_code: "",
    kpi_type: "strategic",
    year: new Date().getFullYear(),
    quarter: 0,
    zone: "",
    benchmark_entity: "",
    internal_achievement: 0,
    benchmark_achievement: 0,
    notes: "",
  });

  const handleCreate = async () => {
    await createBenchmark.mutateAsync(formData);
    setShowForm(false);
    setFormData({
      kpi_code: "",
      kpi_type: "strategic",
      year: new Date().getFullYear(),
      quarter: 0,
      zone: "",
      benchmark_entity: "",
      internal_achievement: 0,
      benchmark_achievement: 0,
      notes: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this benchmark record?")) {
      await deleteBenchmark.mutateAsync(id);
    }
  };

  const zones = Array.from(new Set(items.map((b) => b.zone).filter(Boolean)));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              KPI Benchmarks
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Compare internal achievement against external benchmarks by zone
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Benchmark
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
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
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
              <p className="text-sm font-medium">Failed to load benchmarks</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No benchmarks found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Add a benchmark to compare internal achievement against external
              entities
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
                    Year
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    Zone
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    Entity
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    Internal
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    Benchmark
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    Variance
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((b: KpiBenchmark) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
                      {b.kpi_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {b.year}
                      {b.quarter ? ` Q${b.quarter}` : ""}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {b.zone ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {b.zone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {b.benchmark_entity}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-right text-slate-700 dark:text-slate-300">
                      {b.internal_achievement}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-right text-slate-700 dark:text-slate-300">
                      {b.benchmark_achievement}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-sm tabular-nums font-medium ${b.variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {b.variance >= 0 ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {b.variance.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(b.id)}
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
            Add Benchmark
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Benchmark Entity
              </label>
              <input
                value={formData.benchmark_entity}
                onChange={(e) =>
                  setFormData({ ...formData, benchmark_entity: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="e.g. Industry Average, Target 2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Internal Achievement
              </label>
              <input
                type="number"
                value={formData.internal_achievement || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    internal_achievement: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Benchmark Achievement
              </label>
              <input
                type="number"
                value={formData.benchmark_achievement || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    benchmark_achievement: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createBenchmark.isPending}>
              {createBenchmark.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
