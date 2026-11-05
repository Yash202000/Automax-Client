import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Info,
} from "lucide-react";
import {
  useKpiBenchmarks,
  useCreateKpiBenchmark,
  useDeleteKpiBenchmark,
  useUpdateKpiBenchmark,
  useKpiCardDefinitions,
} from "../../../hooks/useKpi";
import { kpiComposedApi } from "../../../api/kpi";
import { useSettings } from "../../../contexts/SettingsContext";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type { KpiBenchmark, KpiBenchmarkRequest } from "../../../types/kpi";

const MUNICIPALITY_KEYS = [
  "municipality1",
  "municipality2",
  "municipality3",
] as const;
type MunicipalityKey = (typeof MUNICIPALITY_KEYS)[number];
const EMPTY_MUNICIPALITIES: Record<MunicipalityKey, string> = {
  municipality1: "",
  municipality2: "",
  municipality3: "",
};

// Optional field: empty is valid, otherwise must be a number in [0, 100].
const isValidPercent = (value: string): boolean => {
  if (value.trim() === "") return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100;
};

const DEFAULT_FORM: KpiBenchmarkRequest = {
  kpi_code: "",
  kpi_type: "strategic",
  year: new Date().getFullYear(),
  quarter: 0,
  zone: "",
  benchmark_entity: "",
  internal_achievement: 0,
  benchmark_achievement: 0,
  notes: "",
};

export const KpiBenchmarkPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  // Municipality labels from admin-configurable settings, falling back to i18n
  const municipalityLabels: Record<MunicipalityKey, string> = {
    municipality1:
      settings?.municipality1_name || t("kpi.benchmarks.municipality1"),
    municipality2:
      settings?.municipality2_name || t("kpi.benchmarks.municipality2"),
    municipality3:
      settings?.municipality3_name || t("kpi.benchmarks.municipality3"),
  };

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
    id: c.id,
    code: c.code,
    label: `${c.code} — ${c.name_en}`,
    type: c.type,
  }));
  const createBenchmark = useCreateKpiBenchmark();
  const updateBenchmark = useUpdateKpiBenchmark();
  const deleteBenchmark = useDeleteKpiBenchmark();

  const items = benchmarks ?? [];

  // --- Form state (shared between create and edit) ---
  const [showForm, setShowForm] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<KpiBenchmark | null>(
    null,
  );
  const [formData, setFormData] = useState<KpiBenchmarkRequest>({
    ...DEFAULT_FORM,
  });
  const [municipalities, setMunicipalities] =
    useState<Record<MunicipalityKey, string>>(EMPTY_MUNICIPALITIES);
  const [submitted, setSubmitted] = useState(false);

  // Auto-fetch internal achievement state
  const [autoFetching, setAutoFetching] = useState(false);
  const [noActualData, setNoActualData] = useState(false);

  // --- Detail/comparison modal ---
  const [selected, setSelected] = useState<KpiBenchmark | null>(null);

  const municipalityErrors = MUNICIPALITY_KEYS.filter(
    (k) => !isValidPercent(municipalities[k]),
  );

  const formErrors = {
    kpi_code:
      !formData.kpi_code || formData.kpi_code.length > 50
        ? t("kpi.benchmarks.errors.required")
        : "",
    kpi_type: !formData.kpi_type ? t("kpi.benchmarks.errors.required") : "",
    year:
      !formData.year || formData.year < 2020 || formData.year > 2040
        ? t("kpi.benchmarks.errors.yearRange")
        : "",
    benchmark_entity:
      !formData.benchmark_entity.trim() ||
      formData.benchmark_entity.length > 255
        ? t("kpi.benchmarks.errors.required")
        : "",
  };
  const hasFormErrors = Object.values(formErrors).some(Boolean);
  const showError = (k: keyof typeof formErrors) =>
    submitted && formErrors[k] ? (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
        {formErrors[k]}
      </p>
    ) : null;
  const errBorder = (k: keyof typeof formErrors) =>
    submitted && formErrors[k]
      ? "border-red-500"
      : "border-slate-300 dark:border-slate-600";

  // Track the latest fetch request to avoid stale responses overwriting current data
  const fetchIdRef = useRef(0);

  // Auto-fetch internal achievement when KPI code + year change
  useEffect(() => {
    if (!showForm) return;
    const kpiCode = formData.kpi_code;
    const year = formData.year;

    if (!kpiCode || !year) {
      setNoActualData(false);
      return;
    }
    const card = (allCards ?? []).find((c) => c.code === kpiCode);
    if (!card) {
      setNoActualData(true);
      return;
    }

    // Reset achievement while fetching to prevent stale data submission
    setFormData((prev) => ({ ...prev, internal_achievement: 0 }));
    setAutoFetching(true);
    setNoActualData(false);

    const currentFetchId = ++fetchIdRef.current;
    let cancelled = false;

    kpiComposedApi
      .getAnnualRollup(card.type as any, card.id)
      .then((res) => {
        if (cancelled || fetchIdRef.current !== currentFetchId) return;
        const rows = res.data ?? [];
        const match = rows.find((r) => r.year === year);
        if (match && match.achievement_pct != null) {
          const pct = match.achievement_pct;
          setFormData((prev) => ({
            ...prev,
            internal_achievement: Number(pct.toFixed(2)),
          }));
          setNoActualData(false);
        } else {
          setFormData((prev) => ({ ...prev, internal_achievement: 0 }));
          setNoActualData(true);
        }
      })
      .catch(() => {
        if (cancelled || fetchIdRef.current !== currentFetchId) return;
        setFormData((prev) => ({ ...prev, internal_achievement: 0 }));
        setNoActualData(true);
      })
      .finally(() => {
        if (cancelled || fetchIdRef.current !== currentFetchId) return;
        setAutoFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formData.kpi_code, formData.year, showForm, allCards]);

  const openCreateForm = () => {
    setEditingBenchmark(null);
    setFormData({ ...DEFAULT_FORM });
    setMunicipalities(EMPTY_MUNICIPALITIES);
    setSubmitted(false);
    setNoActualData(false);
    setShowForm(true);
  };

  const openEditForm = (b: KpiBenchmark) => {
    setEditingBenchmark(b);
    setFormData({
      kpi_code: b.kpi_code,
      kpi_type: b.kpi_type,
      year: b.year,
      quarter: b.quarter,
      zone: b.zone || "",
      benchmark_entity: b.benchmark_entity,
      internal_achievement: b.internal_achievement,
      benchmark_achievement: b.benchmark_achievement,
      notes: b.notes || "",
    });
    setMunicipalities({
      municipality1: b.municipality1 != null ? String(b.municipality1) : "",
      municipality2: b.municipality2 != null ? String(b.municipality2) : "",
      municipality3: b.municipality3 != null ? String(b.municipality3) : "",
    });
    setSubmitted(false);
    setNoActualData(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBenchmark(null);
    setSubmitted(false);
    setMunicipalities(EMPTY_MUNICIPALITIES);
    setNoActualData(false);
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (hasFormErrors || municipalityErrors.length > 0) return;
    const payload: KpiBenchmarkRequest = { ...formData };
    MUNICIPALITY_KEYS.forEach((k) => {
      const v = municipalities[k].trim();
      if (v !== "") payload[k] = Number(v);
    });
    if (editingBenchmark) {
      await updateBenchmark.mutateAsync({
        id: editingBenchmark.id,
        data: payload,
      });
    } else {
      await createBenchmark.mutateAsync(payload);
    }
    closeForm();
    setFormData({ ...DEFAULT_FORM });
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("kpi.benchmarks.deleteConfirm"))) {
      await deleteBenchmark.mutateAsync(id);
    }
  };

  const zones = Array.from(new Set(items.map((b) => b.zone).filter(Boolean)));
  const isSaving = createBenchmark.isPending || updateBenchmark.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.benchmarks.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.benchmarks.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="w-4 h-4" />
          {t("kpi.benchmarks.addBenchmark")}
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("kpi.benchmarks.searchPlaceholder")}
            className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("kpi.benchmarks.allZones")}</option>
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
                {t("kpi.benchmarks.failedToLoad")}
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("kpi.benchmarks.empty")}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t("kpi.benchmarks.emptyHint")}
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
                    {t("kpi.targets.table.year")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.segmentation.zone")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.entity")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.internal")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.benchmark")}
                  </th>
                  {MUNICIPALITY_KEYS.map((k) => (
                    <th
                      key={k}
                      className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase"
                    >
                      {municipalityLabels[k]}
                    </th>
                  ))}
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.variance")}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((b: KpiBenchmark) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
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
                    {MUNICIPALITY_KEYS.map((k) => (
                      <td
                        key={k}
                        className="px-6 py-4 text-sm tabular-nums text-right text-slate-700 dark:text-slate-300"
                      >
                        {b[k] != null ? `${b[k]}%` : "-"}
                      </td>
                    ))}
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(b);
                          }}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title={t("common.edit")}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(b.id);
                          }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={showForm} onClose={closeForm} size="lg">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editingBenchmark
              ? t("kpi.benchmarks.editBenchmark")
              : t("kpi.benchmarks.addBenchmark")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.targets.form.kpiCode")}
                <span className="text-red-500 ms-0.5">*</span>
              </label>
              <select
                value={formData.kpi_code}
                onChange={(e) => {
                  const sel = cardOptions.find(
                    (c) => c.code === e.target.value,
                  );
                  setFormData({
                    ...formData,
                    kpi_code: e.target.value,
                    kpi_type: (sel?.type as any) ?? formData.kpi_type,
                  });
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${errBorder("kpi_code")} bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
              >
                <option value="">-- {t("kpi.targets.form.kpiCode")} --</option>
                {cardOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              {showError("kpi_code")}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.targets.form.kpiType")}
                <span className="text-red-500 ms-0.5">*</span>
              </label>
              <select
                value={formData.kpi_type}
                onChange={(e) =>
                  setFormData({ ...formData, kpi_type: e.target.value as any })
                }
                className={`w-full px-3 py-2 text-sm rounded-lg border ${errBorder("kpi_type")} bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
              >
                <option value="strategic">
                  {t("kpi.dictionary.strategic")}
                </option>
                <option value="operational">
                  {t("kpi.dictionary.operational")}
                </option>
                <option value="award">{t("kpi.dictionary.award")}</option>
              </select>
              {showError("kpi_type")}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.targets.table.year")}
                <span className="text-red-500 ms-0.5">*</span>
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: Number(e.target.value) })
                }
                min={2020}
                max={2040}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${errBorder("year")} bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
              />
              {showError("year")}
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.benchmarks.entity")}
                <span className="text-red-500 ms-0.5">*</span>
              </label>
              <input
                value={formData.benchmark_entity}
                onChange={(e) =>
                  setFormData({ ...formData, benchmark_entity: e.target.value })
                }
                className={`w-full px-3 py-2 text-sm rounded-lg border ${errBorder("benchmark_entity")} bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
                maxLength={255}
                placeholder={t("kpi.benchmarks.entityPlaceholder")}
              />
              {showError("benchmark_entity")}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.benchmarks.internal")}
                {autoFetching && (
                  <Loader2 className="inline w-3 h-3 ms-1 animate-spin" />
                )}
              </label>
              <input
                type="number"
                value={formData.internal_achievement || 0}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white cursor-not-allowed"
              />
              {noActualData && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {t(
                    "kpi.benchmarks.noActualData",
                    "No actual data available for the selected KPI and year",
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.benchmarks.benchmark")}
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
            {MUNICIPALITY_KEYS.map((k) => {
              const invalid = !isValidPercent(municipalities[k]);
              return (
                <div key={k}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {municipalityLabels[k]} (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={municipalities[k]}
                    onChange={(e) =>
                      setMunicipalities({
                        ...municipalities,
                        [k]: e.target.value,
                      })
                    }
                    aria-invalid={invalid}
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${invalid ? "border-red-500" : "border-slate-300 dark:border-slate-600"}`}
                  />
                  {invalid && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {t("kpi.benchmarks.percentRangeError")}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("kpi.benchmarks.notes")}
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
            <Button variant="outline" onClick={closeForm}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSaving || autoFetching || municipalityErrors.length > 0
              }
            >
              {isSaving ? "..." : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Comparison / Detail Modal */}
      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        size="lg"
      >
        {selected && (
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("kpi.benchmarks.comparisonTitle")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selected.kpi_code} · {selected.year}
                {selected.quarter ? ` Q${selected.quarter}` : ""}
              </p>
            </div>
            <div className="flex items-end justify-around gap-4 h-64 border-b border-slate-300 dark:border-slate-600 pt-6">
              {[
                {
                  key: "us",
                  label: t("kpi.benchmarks.us"),
                  value: selected.benchmark_achievement as
                    | number
                    | null
                    | undefined,
                  isUs: true,
                },
                ...MUNICIPALITY_KEYS.map((k) => ({
                  key: k,
                  label: municipalityLabels[k],
                  value: selected[k],
                  isUs: false,
                })),
              ].map((bar) => (
                <div
                  key={bar.key}
                  className="flex-1 h-full flex flex-col justify-end items-center"
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    {bar.value != null ? `${bar.value}%` : "-"}
                  </span>
                  <div
                    className={`w-full max-w-[90px] rounded-t-md transition-all ${bar.isUs ? "bg-blue-600" : "bg-slate-400 dark:bg-slate-500"}`}
                    style={{
                      height: `${Math.min(Math.max(bar.value ?? 0, 0), 100) * 0.8}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-around gap-4 text-center">
              {[
                {
                  key: "us",
                  label: t("kpi.benchmarks.us"),
                  sub: t("kpi.benchmarks.ourResult"),
                },
                ...MUNICIPALITY_KEYS.map((k) => {
                  const v = selected[k];
                  const ours = selected.benchmark_achievement;
                  const gap = v != null ? v - ours : null;
                  return {
                    key: k,
                    label: municipalityLabels[k],
                    sub:
                      gap != null
                        ? `${t("kpi.benchmarks.gap")} ${gap > 0 ? "+" : ""}${Number(gap.toFixed(1))}`
                        : "-",
                  };
                }),
              ].map((c) => (
                <div key={c.key} className="flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {c.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.sub}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
