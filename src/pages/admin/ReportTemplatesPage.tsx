import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileBarChart, Plus, Loader2 } from "lucide-react";
import { Button } from "../../components/ui";
import {
  classificationApi,
  departmentApi,
  locationApi,
  reportApi,
  userApi,
} from "../../api/admin";
import type {
  ReportTemplate,
  ReportDataSource,
  Department,
  Classification,
  Location,
} from "../../types";
import { ReportTemplateCard } from "@/components/reports";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuthStore } from "@/stores/authStore";

const dataSourceInfo: Record<
  ReportDataSource,
  { labelKey: string; color: string }
> = {
  incidents: {
    labelKey: "reports.dataSources.incidents",
    color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  action_logs: {
    labelKey: "reports.dataSources.actionLogs",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  users_performance: {
    labelKey: "reports.dataSources.users_performance",
    color:
      "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  departments: {
    labelKey: "reports.dataSources.departments",
    color:
      "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  },
  locations: {
    labelKey: "reports.dataSources.locations",
    color:
      "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  workflows: {
    labelKey: "reports.dataSources.workflows",
    color:
      "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

export const ReportTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [filterSource, setFilterSource] = useState<ReportDataSource | "">("");
  const [dynamicOptionsMap, setDynamicOptionsMap] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const user = useAuthStore((state) => state.user);

  const canCreateReport =
    isSuperAdmin || hasPermission(PERMISSIONS.REPORTS_CREATE);

  // Fetch hierarchical data for dynamic dropdowns
  const { data: departmentsTree } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });

  const { data: locationsTree } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const { data: classificationsTree } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });

  const { data: userOptions } = useQuery({
    queryKey: ["admin", "users", "options"],
    queryFn: () => userApi.list(),
  });

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["admin", "reports", "templates", filterSource],
    queryFn: () => reportApi.listTemplates(filterSource || undefined),
  });

  const templates =
    templatesData?.data?.filter(
      (template) => template.created_by?.id === user?.id || template.is_public,
    ) || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "reports", "templates"],
      });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => reportApi.duplicateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "reports", "templates"],
      });
    },
  });

  const handleDelete = (template: ReportTemplate) => {
    if (confirm(`${t("reports.deleteConfirm")} "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = (template: ReportTemplate) => {
    duplicateMutation.mutate(template.id);
  };

  const handleEdit = (template: ReportTemplate) => {
    navigate(`/reports/builder/${template.id}`);
  };

  const flattenTreeWithLabels = <
    T extends {
      id: string;
      name: string;
      path?: string;
      level?: number;
      children?: T[];
    },
  >(
    items: T[],
    level: number = 0,
  ): { value: string; label: string }[] => {
    const result: { value: string; label: string }[] = [];

    for (const item of items) {
      const indent = level > 0 ? "│  ".repeat(level - 1) + "├─ " : "";
      result.push({
        value: item.id,
        label: indent + item.name,
      });

      if (item.children && item.children.length > 0) {
        result.push(...flattenTreeWithLabels(item.children, level + 1));
      }
    }

    return result;
  };

  useEffect(() => {
    const map: Record<string, { value: string; label: string }[]> = {};

    if (departmentsTree?.data) {
      map.departments = flattenTreeWithLabels(
        departmentsTree.data as (Department & { children?: Department[] })[],
      );
    }

    if (locationsTree?.data) {
      map.locations = flattenTreeWithLabels(
        locationsTree.data as (Location & { children?: Location[] })[],
      );
    }

    if (classificationsTree?.data) {
      map.classifications = flattenTreeWithLabels(
        classificationsTree.data as (Classification & {
          children?: Classification[];
        })[],
      );
    }

    if (userOptions?.data) {
      map.users = userOptions.data.map((user) => ({
        value: user.id,
        label:
          user.first_name && user.last_name
            ? user.first_name + " " + user.last_name
            : user.username || user.email,
      })) as { value: string; label: string }[];
    }

    setDynamicOptionsMap(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentsTree, locationsTree, classificationsTree, userOptions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
              <FileBarChart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("reports.templates")}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ltr:ml-12 rtl:mr-12">
            {t("reports.templatesSubtitle")}
          </p>
        </div>

        {canCreateReport && (
          <Button
            onClick={() => navigate("/reports/builder")}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t("reports.newReport")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filterSource}
          onChange={(e) =>
            setFilterSource(e.target.value as ReportDataSource | "")
          }
          className="px-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        >
          <option value="">{t("reports.allDataSources")}</option>
          {Object.entries(dataSourceInfo).map(([key, info]) => (
            <option key={key} value={key}>
              {t(info.labelKey)}
            </option>
          ))}
        </select>

        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {templates.length}{" "}
          {templates.length !== 1
            ? t("reports.templates_count")
            : t("reports.template")}
        </span>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
          <FileBarChart className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">
            {t("reports.noTemplatesYet")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">
            {t("reports.createFirstTemplate")}
          </p>
          <Button onClick={() => navigate("/reports/builder")}>
            {t("reports.createReport")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.map((template) => (
            <ReportTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              dynamicOptionsMap={dynamicOptionsMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportTemplatesPage;
