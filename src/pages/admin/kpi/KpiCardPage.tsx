import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Building2,
  Calendar,
  Layers,
  ClipboardCheck,
  Database,
  Users,
  Gauge,
} from "lucide-react";
import { useKpiCard } from "../../../hooks/useKpi";
import { BAND_BAR_CLASS, BAND_TEXT_CLASS } from "../../../utils/kpiBand";

// Same maps used across the KPI dictionary/detail pages — reused here so the
// card reads consistently with the rest of the module.
const typeColorMap: Record<string, string> = {
  strategic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  operational:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  award:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const statusColorMap: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

/**
 * One-page "KPI Card": a single KPI's definition fields, its multi-year
 * Target Plan, and its Performance Bands — the central deliverable of the
 * Eastern Region KPI Dictionary spec. Backed by the composed
 * GET /kpi/:type/:id/card endpoint so everything renders from one call.
 *
 * Intended route: /goals/kpi/dictionary/:type/:id/card
 * (mirrors the existing /goals/kpi/dictionary/:type/:id detail route).
 */
export const KpiCardPage: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { data, isLoading, error } = useKpiCard(type, id);
  const card = data;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
          <AlertTriangle className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-medium">
            KPI card not found or you don't have permission to view it.
          </p>
          <Link
            to="/goals/kpi/dictionary"
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Back to KPI Dictionary
          </Link>
        </div>
      </div>
    );
  }

  const greenMin = card.bands?.green_min ?? 80;
  const amberMin = card.bands?.amber_min ?? 60;

  const infoTiles: {
    icon: React.ReactNode;
    bg: string;
    label: string;
    value: string;
  }[] = [
    {
      icon: <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      label: "Pillar / Enabler",
      value: card.pillar_enabler_label,
    },
    {
      icon: <Target className="w-5 h-5 text-green-600 dark:text-green-400" />,
      bg: "bg-green-50 dark:bg-green-900/20",
      label: "Strategic Goal",
      value: card.strategic_goal_label,
    },
    {
      icon: (
        <ClipboardCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      ),
      bg: "bg-purple-50 dark:bg-purple-900/20",
      label: "Related Criterion",
      value: card.criterion_label,
    },
    {
      icon: <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: "bg-amber-50 dark:bg-amber-900/20",
      label: "Reporting Frequency",
      value: card.reporting_frequency,
    },
    {
      icon: <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
      bg: "bg-slate-100 dark:bg-slate-700/40",
      label: "Data Source",
      value: card.data_source,
    },
    {
      icon: <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      bg: "bg-teal-50 dark:bg-teal-900/20",
      label: "Related Units",
      value: card.related_units_label,
    },
  ];

  const detailFields = [
    { label: "Formula", value: card.formula },
    { label: "Polarity", value: card.polarity },
    { label: "Unit of Measure", value: card.unit_of_measure },
    { label: "Baseline", value: String(card.baseline) },
  ];

  const targetPlan = [...(card.target_plan ?? [])].sort(
    (a, b) => a.target_year - b.target_year,
  );

  const bandRows: {
    color: "green" | "amber" | "red";
    label: string;
    range: string;
  }[] = [
    { color: "green", label: "Green", range: `>= ${greenMin}%` },
    {
      color: "amber",
      label: "Yellow / Amber",
      range: `${amberMin}% – ${greenMin}%`,
    },
    { color: "red", label: "Red", range: `< ${amberMin}%` },
  ];

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      {/* ── Back link + Print action (hidden on print) ─────────────── */}
      <div className="flex items-center justify-between no-print">
        <Link
          to={
            type && id
              ? `/goals/kpi/dictionary/${type}/${id}`
              : "/goals/kpi/dictionary"
          }
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
          Back to KPI Detail
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* ── Card body: single-column document, not a dashboard ─────── */}
      <div className="max-w-3xl mx-auto space-y-6 print:max-w-none print:space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 print:border-none print:shadow-none">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                {card.name_en}
              </h1>
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">
                {card.code}
              </p>
              {card.name_ar && (
                <p
                  className="text-base text-slate-600 dark:text-slate-300 print:text-black mt-0.5"
                  dir="rtl"
                >
                  {card.name_ar}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColorMap[card.type] ?? ""} print:bg-transparent print:px-0`}
              >
                {card.type}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColorMap[card.activation_status] ?? ""} print:bg-transparent print:px-0`}
              >
                {card.activation_status === "active" ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : card.activation_status === "inactive" ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {card.activation_status}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-6 flex-wrap text-sm text-slate-600 dark:text-slate-300 print:text-black">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              Owner:{" "}
              <span className="font-medium">{card.owner_label || "-"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              Lifecycle:{" "}
              <span className="font-medium">{card.lifecycle || "-"}</span>
            </span>
          </div>
        </div>

        {/* Info tiles */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 print:border-none print:shadow-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {infoTiles.map((tile, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 print:hidden ${tile.bg}`}
                >
                  {tile.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                    {tile.label}
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white print:text-black truncate">
                    {tile.value || "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 print:border-none print:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white print:text-black mb-4">
            Description
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                English
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 print:text-black leading-relaxed whitespace-pre-wrap">
                {card.description_en || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                Arabic
              </p>
              <p
                className="text-sm text-slate-700 dark:text-slate-300 print:text-black leading-relaxed whitespace-pre-wrap"
                dir="rtl"
              >
                {card.description_ar || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Details grid: Formula, Polarity, Unit of Measure, Baseline */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 print:border-none print:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white print:text-black mb-4">
            Measurement
          </h2>
          {card.formula && (
            <pre className="text-sm font-mono text-slate-700 dark:text-slate-300 print:text-black bg-slate-50 dark:bg-slate-900 print:bg-transparent rounded-lg p-4 whitespace-pre-wrap break-words mb-4">
              {card.formula}
            </pre>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-8">
            {detailFields.slice(1).map((field, i) => (
              <div key={i}>
                <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 mb-1">
                  {field.label}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white print:text-black">
                  {field.value || "-"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Target Plan */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden print:border-none print:shadow-none">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white print:text-black mb-4">
              Target Plan
            </h2>
          </div>
          {targetPlan.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-500 dark:text-slate-400">
              No targets have been set for this KPI yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full print:w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 print:bg-slate-100">
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-4 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Target Value
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {targetPlan.map((row, i) => (
                    <tr
                      key={`${row.target_year}-${row.period_code}-${i}`}
                      className="border-b border-slate-100 dark:border-slate-700/30 last:border-0 print:border-slate-300"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white print:text-black">
                        {row.target_year}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 print:text-black">
                        {row.period_code}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-right text-slate-700 dark:text-slate-200 print:text-black">
                        {row.target_value}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 print:text-black">
                        {row.target_frequency || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 print:text-black">
                        {row.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="h-6" />
        </div>

        {/* Performance Bands */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 print:border-none print:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white print:text-black mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-slate-400 print:hidden" />
            Performance Bands
          </h2>
          <div className="space-y-2">
            {bandRows.map((band) => (
              <div
                key={band.color}
                className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-700/50 px-4 py-2.5"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${BAND_BAR_CLASS[band.color]}`}
                />
                <span
                  className={`text-sm font-semibold ${BAND_TEXT_CLASS[band.color]}`}
                >
                  {band.label}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300 print:text-black ms-auto tabular-nums">
                  {band.range}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiCardPage;
