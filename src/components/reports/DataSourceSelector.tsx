import React from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
  BarChart3,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportDataSource } from "../../types";

interface DataSourceSelectorProps {
  value: ReportDataSource | null;
  onChange: (source: ReportDataSource) => void;
}

const iconMap: Record<string, React.ElementType> = {
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
  BarChart3,
  Tag,
};

const dataSources: {
  key: ReportDataSource;
  labelKey: string;
  descKey: string;
  icon: string;
}[] = [
  {
    key: "incidents",
    labelKey: "reports.dataSources.incidents",
    descKey: "reports.dataSources.incidentsDesc",
    icon: "AlertCircle",
  },
  {
    key: "requests",
    labelKey: "reports.dataSources.requests",
    descKey: "reports.dataSources.requestsDesc",
    icon: "FileText",
  },
  {
    key: "action_logs",
    labelKey: "reports.dataSources.actionLogs",
    descKey: "reports.dataSources.actionLogsDesc",
    icon: "FileText",
  },
  {
    key: "users",
    labelKey: "reports.dataSources.users",
    descKey: "reports.dataSources.usersDesc",
    icon: "Users",
  },
  {
    key: "departments",
    labelKey: "reports.dataSources.departments",
    descKey: "reports.dataSources.departmentsDesc",
    icon: "Building2",
  },
  {
    key: "locations_by_status",
    labelKey: "reports.dataSources.locations",
    descKey: "reports.dataSources.locationsDesc",
    icon: "MapPin",
  },
  {
    key: "classifications_by_status",
    labelKey: "reports.dataSources.classifications",
    descKey: "reports.dataSources.classificationsDesc",
    icon: "Tag",
  },
  {
    key: "workflows",
    labelKey: "reports.dataSources.workflows",
    descKey: "reports.dataSources.workflowsDesc",
    icon: "GitBranch",
  },
];

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3">
      {dataSources.map((source) => {
        const Icon = iconMap[source.icon] || AlertCircle;
        const isSelected =
          value === source.key ||
          (source.key === "locations_by_status" &&
            value === "locations_by_count") ||
          (source.key === "classifications_by_status" &&
            value === "classifications_by_count") ||
          (source.key === "users" && value === "users_performance");

        return (
          <button
            key={source.key}
            type="button"
            onClick={() => onChange(source.key)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
              isSelected
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.5)]",
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isSelected
                  ? "bg-[hsl(var(--primary))] text-white"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-center w-full">
              <p
                className={cn(
                  "text-sm font-medium",
                  isSelected
                    ? "text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--foreground))]",
                )}
              >
                {t(source.labelKey)}
              </p>

              {source.key === "locations_by_status" && isSelected ? (
                <select
                  value={value || "locations_by_status"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onChange(e.target.value as ReportDataSource)}
                  className="mt-2 w-full p-1 text-[10px] border rounded bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="locations_by_status">
                    {t("reports.dataSources.location_types.status")}
                  </option>
                  <option value="locations_by_count">
                    {t("reports.dataSources.location_types.count")}
                  </option>
                </select>
              ) : source.key === "classifications_by_status" && isSelected ? (
                <select
                  value={value || "classifications_by_status"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onChange(e.target.value as ReportDataSource)}
                  className="mt-2 w-full p-1 text-[10px] border rounded bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="classifications_by_status">
                    {t("reports.dataSources.classification_types.status")}
                  </option>
                  <option value="classifications_by_count">
                    {t("reports.dataSources.classification_types.count")}
                  </option>
                </select>
              ) : source.key === "users" && isSelected ? (
                <select
                  value={value || "users"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onChange(e.target.value as ReportDataSource)}
                  className="mt-2 w-full p-1 text-[10px] border rounded bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="users">
                    {t("reports.dataSources.user_types.standard")}
                  </option>
                  <option value="users_performance">
                    {t("reports.dataSources.user_types.performance")}
                  </option>
                </select>
              ) : (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">
                  {t(source.descKey)}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DataSourceSelector;
