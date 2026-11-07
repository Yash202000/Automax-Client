import React from "react";
import { kpiTargetsImportApi } from "../../../api/kpi";
import {
  KpiImportPage,
  type KpiImportPageConfig,
} from "./KpiDictionaryImportPage";

// Bulk import of KpiAnnualTarget rows for existing KPIs, using the shared
// import UI. The route's targets:set gate also covers update mode.
const TARGETS_IMPORT_CONFIG: KpiImportPageConfig = {
  ns: "kpi.targetsImport",
  categories: ["target"],
  api: kpiTargetsImportApi,
  backTo: "/goals/kpi/targets",
  backLabelKey: "kpi.targetsImport.backToTargets",
  goTo: "/goals/kpi/targets",
  goToLabelKey: "kpi.targetsImport.goToTargets",
  canUpdateExisting: () => true,
};

export const KpiTargetsImportPage: React.FC = () => (
  <KpiImportPage config={TARGETS_IMPORT_CONFIG} />
);

export default KpiTargetsImportPage;
