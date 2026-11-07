import React from "react";
import { kpiMetricsImportApi } from "../../../api/kpi";
import {
  KpiImportPage,
  type KpiImportPageConfig,
} from "./KpiDictionaryImportPage";

// Bulk import of KpiMetric rows under existing KPIs, using the shared import UI.
const METRICS_IMPORT_CONFIG: KpiImportPageConfig = {
  ns: "kpi.metricsImport",
  categories: ["metric"],
  api: kpiMetricsImportApi,
  backTo: "/goals/kpi/dictionary",
  backLabelKey: "kpi.metricsImport.backToDictionary",
  goTo: "/goals/kpi/dictionary",
  goToLabelKey: "kpi.metricsImport.goToDictionary",
};

export const KpiMetricsImportPage: React.FC = () => (
  <KpiImportPage config={METRICS_IMPORT_CONFIG} />
);

export default KpiMetricsImportPage;
