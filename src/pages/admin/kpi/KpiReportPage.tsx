import React, { useState } from "react";
import {
  FileText,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  Printer,
  Download,
} from "lucide-react";
import { useKpiCardDefinitions } from "../../../hooks/useKpi";
import { exportToExcel } from "../../../utils/exportExcel";
import type { KpiCardDef } from "../../../types/kpi";

export const KpiReportPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: cards, isLoading } = useKpiCardDefinitions({
    type: typeFilter || undefined,
    search: search || undefined,
  });

  const items = cards ?? [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              KPI Card Definitions Report
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete listing of all KPI definitions across strategic,
              operational, and award types
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              exportToExcel(
                items as unknown as Record<string, unknown>[],
                "KPI_Report",
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search KPIs..."
            className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="strategic">Strategic</option>
          <option value="operational">Operational</option>
          <option value="award">Award</option>
        </select>
        <span className="text-sm text-slate-500">
          {items.length} KPI{items.length !== 1 ? "s" : ""} found
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden print:border-none">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No KPI card definitions found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full print:w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 print:bg-slate-100">
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Formula
                  </th>
                  <th className="px-4 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Baseline
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Polarity
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Data Source
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((card: KpiCardDef, i: number) => (
                  <tr
                    key={`${card.type}-${card.code}-${i}`}
                    className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 print:border-slate-300"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-white print:text-black">
                      {card.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 print:text-black">
                      <div className="font-medium">{card.name_en}</div>
                      {card.name_ar && (
                        <div
                          className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600"
                          dir="rtl"
                        >
                          {card.name_ar}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          card.type === "strategic"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : card.type === "operational"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        } print:bg-transparent print:px-0`}
                      >
                        {card.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono max-w-[200px] truncate print:text-slate-700">
                      {card.formula || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-right text-slate-700 dark:text-slate-200 print:text-black">
                      {card.baseline ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 print:text-black">
                      {card.unit_of_measure || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 print:text-black">
                      {card.polarity === "ascending" ? (
                        <span className="text-green-600">Ascending</span>
                      ) : card.polarity === "descending" ? (
                        <span className="text-red-600">Descending</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 print:text-black">
                      {card.reporting_frequency || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 max-w-[150px] truncate print:text-black">
                      {card.data_source || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          card.activation_status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : card.activation_status === "draft"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        } print:bg-transparent print:px-0`}
                      >
                        {card.activation_status === "active" ? (
                          <CheckCircle size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                        {card.activation_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
