import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, X, Users, Loader2 } from "lucide-react";
import { departmentApi, escalationPolicyApi } from "@/api/admin";
import type { Department, Role, User } from "@/types";
import { cn } from "@/lib/utils";
import { TreeSelect } from "@/components/ui";
import type { TreeSelectNode } from "@/components/ui/TreeSelect";

export interface TargetEntry {
  department_id?: string;
  department_name?: string;
  role_id?: string;
  role_name?: string;
  excluded_user_ids: string[];
  resolved_users?: User[];
}

interface TargetPickerProps {
  value: TargetEntry[];
  onChange: (targets: TargetEntry[]) => void;
  disabled?: boolean;
}

/** Flatten a Department tree into a lookup map */
function buildDeptMap(
  nodes: Department[],
  map: Map<string, Department> = new Map(),
) {
  for (const n of nodes) {
    map.set(n.id, n);
    if (n.children?.length) buildDeptMap(n.children, map);
  }
  return map;
}

/** Convert Department[] tree → TreeSelectNode[] */
function toTreeNodes(depts: Department[]): TreeSelectNode[] {
  return depts.map((d) => ({
    id: d.id,
    name: d.name,
    children: d.children?.length ? toTreeNodes(d.children) : undefined,
  }));
}

/**
 * Dept (hierarchical tree) + Role (filtered to dept) → auto-populate users → allow removing users.
 */
const TargetPicker: React.FC<TargetPickerProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const { t } = useTranslation();

  // Draft state
  const [draftDeptId, setDraftDeptId] = useState("");
  const [draftRoleId, setDraftRoleId] = useState("");
  const [deptRoles, setDeptRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Dept tree
  const { data: treeData } = useQuery({
    queryKey: ["departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });
  const deptTree: Department[] = treeData?.data || [];
  const deptMap = buildDeptMap(deptTree);
  const treeNodes = toTreeNodes(deptTree);

  // When draft dept changes → fetch its roles and reset role selection
  useEffect(() => {
    setDraftRoleId("");
    setDeptRoles([]);
    if (!draftDeptId) return;

    setRolesLoading(true);
    departmentApi
      .getById(draftDeptId)
      .then((res) => {
        setDeptRoles(res.data?.roles || []);
      })
      .catch(() => setDeptRoles([]))
      .finally(() => setRolesLoading(false));
  }, [draftDeptId]);

  const resolveMutation = useMutation({
    mutationFn: (req: { department_id?: string; role_id?: string }) =>
      escalationPolicyApi.resolveUsers(req),
    onSuccess: (res, vars) => {
      const resolved = res.data || [];
      const deptName = vars.department_id
        ? deptMap.get(vars.department_id)?.name
        : undefined;
      const roleName = vars.role_id
        ? deptRoles.find((r) => r.id === vars.role_id)?.name
        : undefined;
      const newEntry: TargetEntry = {
        department_id: vars.department_id,
        department_name: deptName,
        role_id: vars.role_id,
        role_name: roleName,
        excluded_user_ids: [],
        resolved_users: resolved,
      };
      onChange([...value, newEntry]);
      setDraftDeptId("");
      setDraftRoleId("");
    },
  });

  const handleAdd = () => {
    if (!draftDeptId && !draftRoleId) return;
    resolveMutation.mutate({
      department_id: draftDeptId || undefined,
      role_id: draftRoleId || undefined,
    });
  };

  const handleRemoveEntry = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleExcludeUser = (entryIdx: number, userId: string) => {
    onChange(
      value.map((entry, i) => {
        if (i !== entryIdx) return entry;
        return {
          ...entry,
          excluded_user_ids: [...entry.excluded_user_ids, userId],
          resolved_users: entry.resolved_users?.filter((u) => u.id !== userId),
        };
      }),
    );
  };

  const userName = (u: User) =>
    u.first_name ? `${u.first_name} ${u.last_name ?? ""}`.trim() : u.username;

  return (
    <div className="space-y-3">
      {/* Existing target entries */}
      {value.map((entry, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
              <Users className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <span>
                {[entry.department_name, entry.role_name]
                  .filter(Boolean)
                  .join(" · ") || t("escalation.allUsers", "All Users")}
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveEntry(idx)}
                className="p-1 rounded hover:bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Resolved user chips */}
          {entry.resolved_users && entry.resolved_users.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entry.resolved_users.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.15)]"
                >
                  {userName(u)}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleExcludeUser(idx, u.id)}
                      className="ml-0.5 hover:text-[hsl(var(--destructive))] transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t(
                "escalation.noUsersResolved",
                "No users resolved for this target",
              )}
            </p>
          )}
        </div>
      ))}

      {/* Add new target row */}
      {!disabled && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Hierarchical dept picker */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                {t("common.department", "Department")}
              </label>
              <TreeSelect
                data={treeNodes}
                value={draftDeptId}
                onChange={(id) => setDraftDeptId(id)}
                placeholder={t("escalation.selectDept", "Select department...")}
                emptyMessage={t("common.noDepartments", "No departments")}
                maxHeight="220px"
              />
            </div>

            {/* Role — filtered to selected dept */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                {t("common.role", "Role")}
                {draftDeptId && (
                  <span className="ml-1 text-[hsl(var(--muted-foreground))] font-normal">
                    (
                    {rolesLoading
                      ? t("common.loading", "loading...")
                      : `${deptRoles.length} ${t("common.available", "available")}`}
                    )
                  </span>
                )}
              </label>
              <select
                value={draftRoleId}
                onChange={(e) => setDraftRoleId(e.target.value)}
                disabled={rolesLoading}
                className={cn(
                  "w-full h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]",
                  "px-3 text-sm text-[hsl(var(--foreground))]",
                  "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <option value="">{t("common.anyRole", "Any role")}</option>
                {deptRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={
              resolveMutation.isPending ||
              rolesLoading ||
              (!draftDeptId && !draftRoleId)
            }
            className={cn(
              "w-full h-9 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
              "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
              "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {resolveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {t("escalation.addTarget", "Add Target & Resolve Users")}
          </button>
        </div>
      )}

      {value.length === 0 && disabled && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {t("escalation.noTargets", "No targets defined")}
        </p>
      )}
    </div>
  );
};

export default TargetPicker;
