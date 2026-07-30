import React, { useState } from "react";
import { Gauge, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import {
  usePerformanceBands,
  useUpsertPerformanceBand,
  useDeletePerformanceBand,
  useKpiCardDefinitions,
} from "../../../hooks/useKpi";
import { usePermissions } from "../../../hooks/usePermissions";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type { PerformanceBand } from "../../../types/kpi";

const GlobalBandEditor: React.FC<{
  band?: PerformanceBand;
  onSave: (greenMin: number, amberMin: number) => Promise<unknown>;
  isSaving: boolean;
  readOnly: boolean;
}> = ({ band, onSave, isSaving, readOnly }) => {
  const [greenMin, setGreenMin] = useState(band?.green_min ?? 80);
  const [amberMin, setAmberMin] = useState(band?.amber_min ?? 60);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Green ≥
        </label>
        <input
          type="number"
          value={greenMin}
          disabled={readOnly}
          onChange={(e) => setGreenMin(Number(e.target.value))}
          className="w-28 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Amber ≥
        </label>
        <input
          type="number"
          value={amberMin}
          disabled={readOnly}
          onChange={(e) => setAmberMin(Number(e.target.value))}
          className="w-28 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
        />
      </div>
      {!readOnly && (
        <Button onClick={() => onSave(greenMin, amberMin)} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save global default"}
        </Button>
      )}
    </div>
  );
};

export const KpiPerformanceBandsPage: React.FC = () => {
  const { data: bands, isLoading, error } = usePerformanceBands();
  const { data: allCards } = useKpiCardDefinitions();
  const upsertBand = useUpsertPerformanceBand();
  const deleteBand = useDeletePerformanceBand();
  const { isSuperAdmin, canManageGoalHierarchy } = usePermissions();
  const canManage = isSuperAdmin || canManageGoalHierarchy();

  const items = bands ?? [];
  const globalBand = items.find((b) => !b.kpi_code);
  const overrides = items.filter((b) => !!b.kpi_code);

  const handleSaveGlobal = (greenMin: number, amberMin: number) =>
    upsertBand.mutateAsync({
      kpi_code: null,
      green_min: greenMin,
      amber_min: amberMin,
    });

  const [showForm, setShowForm] = useState(false);
  const [overrideKpiCode, setOverrideKpiCode] = useState("");
  const [overrideGreen, setOverrideGreen] = useState(80);
  const [overrideAmber, setOverrideAmber] = useState(60);

  const handleAddOverride = async () => {
    if (!overrideKpiCode) return;
    await upsertBand.mutateAsync({
      kpi_code: overrideKpiCode,
      green_min: overrideGreen,
      amber_min: overrideAmber,
    });
    setShowForm(false);
    setOverrideKpiCode("");
    setOverrideGreen(80);
    setOverrideAmber(60);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this KPI's threshold override?")) {
      await deleteBand.mutateAsync(id);
    }
  };

  const cardOptions = allCards ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Gauge className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Performance Bands
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure the Red / Amber / Green achievement thresholds used
              across KPI dashboards
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">
              Failed to load performance bands
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Global default */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Global default
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Applies to every KPI that doesn't have its own override below.
              Green when achievement is at or above the green threshold, amber
              between the two, red below.
            </p>
            <GlobalBandEditor
              key={globalBand?.id ?? "new"}
              band={globalBand}
              onSave={handleSaveGlobal}
              isSaving={upsertBand.isPending}
              readOnly={!canManage}
            />
          </div>

          {/* Per-KPI overrides */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                KPI-specific overrides
              </h2>
              {canManage && (
                <Button
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowForm(true)}
                >
                  Add override
                </Button>
              )}
            </div>
            {overrides.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  No KPI-specific overrides yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Every KPI uses the global default until you add one here
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
                        Green ≥
                      </th>
                      <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                        Amber ≥
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map((b: PerformanceBand) => (
                      <tr
                        key={b.id}
                        className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
                          {b.kpi_code}
                        </td>
                        <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                          {b.green_min}
                        </td>
                        <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                          {b.amber_min}
                        </td>
                        <td className="px-6 py-4">
                          {canManage && (
                            <button
                              onClick={() => handleDelete(b.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remove override"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="sm">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Add KPI override
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                KPI
              </label>
              <select
                value={overrideKpiCode}
                onChange={(e) => setOverrideKpiCode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Select KPI --</option>
                {cardOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Green ≥
                </label>
                <input
                  type="number"
                  value={overrideGreen}
                  onChange={(e) => setOverrideGreen(Number(e.target.value))}
                  className="w-28 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Amber ≥
                </label>
                <input
                  type="number"
                  value={overrideAmber}
                  onChange={(e) => setOverrideAmber(Number(e.target.value))}
                  className="w-28 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddOverride}
              disabled={upsertBand.isPending || !overrideKpiCode}
            >
              {upsertBand.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
