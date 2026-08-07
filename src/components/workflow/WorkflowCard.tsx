import { classificationApi } from "@/api/admin";

import { cn } from "@/lib/utils";
import type { Workflow } from "@/types";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  Circle,
  Copy,
  Download,
  Edit2,
  GitBranch,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface WorkflowCardProps {
  workflow: Workflow;
  getWorkflowGradient: (workflow: Workflow) => string;
  onEdit: (workflow: Workflow) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
}

export default function WorkflowCard({
  workflow,
  getWorkflowGradient,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
}: WorkflowCardProps) {
  const { data: classificationData } = useQuery({
    queryKey: ["admin", "classification", "tree", workflow.record_type],
    queryFn: () => classificationApi.getTree(workflow.record_type),
    enabled: !!workflow.record_type,
  });

  const classifications = classificationData?.data ?? [];
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  return (
    <div
      key={workflow.id}
      className="group relative bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 hover:shadow-xl hover:shadow-[hsl(var(--foreground)/0.05)] hover:border-[hsl(var(--border))] transition-all duration-300"
    >
      {/* Gradient decoration */}
      <div
        className={cn(
          "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity",
          getWorkflowGradient(workflow),
        )}
      />

      <div className="relative">
        <div className="flex items-start  justify-between mb-4">
          <div className="flex overflow-hidden whitespace-nowrap  group-hover:max-w-[175px] items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 bg-gradient-to-br rounded-xl flex shrink-0 items-center justify-center shadow-lg",
                getWorkflowGradient(workflow),
              )}
            >
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 group-hover:max-w-[175px] ">
              <h3 className="group-hover:truncate text-lg font-semibold text-[hsl(var(--foreground))]">
                {i18n.language === "ar" && workflow.name_ar
                  ? workflow.name_ar
                  : workflow.name}
              </h3>
              <p className="group-hover:truncate text-sm text-[hsl(var(--muted-foreground))] font-mono">
                {workflow.code}
              </p>
            </div>
          </div>

          <div className="items-center gap-1 hidden group-hover:flex justify-end shrink-0">
            <button
              onClick={() => navigate(`/workflows/${workflow.id}`)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
              title={t("workflows.designWorkflow")}
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(workflow)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
              title={t("common.edit")}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDuplicate(workflow.id)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
              title={t("workflows.duplicateWorkflow")}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport(workflow.id);
              }}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
              title={t("workflows.exportWorkflow")}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(workflow.id)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
              title={t("common.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
          {i18n.language === "ar" && workflow.description_ar
            ? workflow.description_ar
            : workflow.description || t("workflows.noDescription")}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {workflow.states_count || 0} {t("workflows.states")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {workflow.transitions_count || 0} {t("workflows.transitions")}
            </span>
          </div>
        </div>

        {/* Classifications */}
        <div className="pt-4 border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              {classifications?.length || 0} {t("workflows.classifications")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {classifications?.slice(0, 3).map((classification) => (
              <span
                key={classification.id}
                className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg"
              >
                {i18n.language === "ar" && classification.name_ar
                  ? classification.name_ar
                  : classification.name}
              </span>
            ))}
            {(classifications?.length || 0) > 3 && (
              <span className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                {t("workflows.moreClassifications", {
                  count: (classifications?.length || 0) - 3,
                })}
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mt-4">
          {workflow.is_default && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm">
              <Sparkles className="w-3 h-3" />
              {t("workflows.default")}
            </span>
          )}
          {!workflow.is_active && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg">
              {t("workflows.inactive")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
