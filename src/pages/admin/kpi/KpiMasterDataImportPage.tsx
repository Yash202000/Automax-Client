import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { kpiMasterDataImportApi } from "../../../api/kpi";
import {
  KpiImportPage,
  type KpiImportPageConfig,
} from "./KpiDictionaryImportPage";

const MASTER_IMPORT_TYPES = [
  "pillar",
  "enabler",
  "operational-objective",
  "process",
  "initiative",
  "domain",
  "award-criterion",
  "award-sub-criterion",
  "award-kpi-measure",
  "data-source",
  "segmentation-dimension",
  "organization",
] as const;

type MasterImportType = (typeof MASTER_IMPORT_TYPES)[number];

const MASTER_DATA_TAB_BY_IMPORT_TYPE: Record<MasterImportType, string> = {
  pillar: "pillar",
  enabler: "enabler",
  "operational-objective": "objectives-tree",
  process: "objectives-tree",
  initiative: "initiative",
  domain: "domain",
  "award-criterion": "award-criterion",
  "award-sub-criterion": "award-sub-criterion",
  "award-kpi-measure": "award-kpi-measure",
  "data-source": "data-source",
  "segmentation-dimension": "segmentation-dimension",
  organization: "organization",
};

const isMasterImportType = (value: string | null): value is MasterImportType =>
  !!value && (MASTER_IMPORT_TYPES as readonly string[]).includes(value);

// Generic upload → validate → commit page for every Master Data tab; ?type
// selects the server-side entity.
export const KpiMasterDataImportPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const rawType = searchParams.get("type");
  const type = isMasterImportType(rawType) ? rawType : null;

  if (!type) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("kpi.masterDataImport.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("kpi.masterDataImport.unknownType")}
        </p>
        <Link
          to="/goals/kpi/master-data"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          {t("kpi.masterDataImport.backToMasterData")}
        </Link>
      </div>
    );
  }

  const masterDataUrl = `/goals/kpi/master-data?tab=${MASTER_DATA_TAB_BY_IMPORT_TYPE[type]}&standalone=1`;
  const config: KpiImportPageConfig = {
    ns: "kpi.masterDataImport",
    categories: [type],
    api: kpiMasterDataImportApi(type),
    backTo: masterDataUrl,
    backLabelKey: "kpi.masterDataImport.backToMasterData",
    goTo: masterDataUrl,
    goToLabelKey: "kpi.masterDataImport.goToMasterData",
    // The route is already gated on goals:manage, which also grants updates.
    canUpdateExisting: () => true,
  };

  return <KpiImportPage config={config} />;
};

export default KpiMasterDataImportPage;
