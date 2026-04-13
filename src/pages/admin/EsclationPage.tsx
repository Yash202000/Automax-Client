import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  Calendar,
  Building2,
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  Users,
  ListChecks,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "../../components/ui";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { escalationApi, escalationPolicyApi } from "@/api/admin";
import CreateEscalationModal from "@/components/esclation/CreateEscalationModal";
import EscalationPolicyModal from "@/components/escalation/EscalationPolicyModal";
import { toast } from "sonner";
import usePermissions from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { EscalationPolicy } from "@/types";

// ─── Sub-types ───────────────────────────────────────────────────────────────

interface EscalationUser {
  id: string;
  first_name?: string;
  last_name?: string;
  username: string;
  avatar?: string;
}

interface EscalationTarget {
  id: string;
  department?: { id: string; name: string };
  role?: { id: string; name: string };
  excluded_user_ids?: string[];
}

interface EscalationConfig {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  classification?: any;
  classifications?: any[];
  frequency?: string;
  channel?: string;
  users?: EscalationUser[];
  targets?: EscalationTarget[];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const StatusBadge = ({ active }: { active: boolean }) => {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        active
          ? "bg-green-500/10 text-green-600 dark:text-green-400"
          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          active ? "bg-green-500" : "bg-[hsl(var(--muted-foreground))]",
        )}
      />
      {active ? t("escalation.active") : t("escalation.inactive")}
    </span>
  );
};

const DeleteModal: React.FC<{
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ name, onConfirm, onCancel, isLoading }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-[hsl(var(--destructive)/0.1)] shrink-0">
            <Trash2 className="w-6 h-6 text-[hsl(var(--destructive))]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {t("escalation.deleteTitle")}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {t("escalation.deleteDescription", { name })}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            isLoading={isLoading}
            leftIcon={!isLoading ? <Trash2 className="w-4 h-4" /> : undefined}
          >
            {t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Escalation Policies ─────────────────────────────────────────────────

const PoliciesTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isSuperAdmin } = usePermissions();

  const [showModal, setShowModal] = useState(false);
  const [editPolicy, setEditPolicy] = useState<EscalationPolicy | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<EscalationPolicy | null>(
    null,
  );
  const [search, setSearch] = useState("");

  const {
    data: policiesData,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ["escalation-policies"],
    queryFn: () => escalationPolicyApi.list(),
  });

  const policies = policiesData?.data || [];

  const filtered = useMemo(() => {
    if (!search) return policies;
    return policies.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [policies, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => escalationPolicyApi.delete(id),
    onSuccess: () => {
      toast.success(t("escalation.policy.deletedSuccess", "Policy deleted"));
      setDeleteTarget(null);
      refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message || t("common.error"));
    },
  });

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString(
      i18n.language === "ar" ? "ar-SA" : "en-US",
      { month: "short", day: "numeric", year: "numeric" },
    );
  };

  if (error && !isLoading) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm text-center">
        <XCircle className="w-10 h-10 text-[hsl(var(--destructive))] mx-auto mb-3" />
        <p className="text-[hsl(var(--muted-foreground))] mb-4">
          {(error as any)?.message}
        </p>
        <Button
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
      {showModal && (
        <EscalationPolicyModal
          editData={editPolicy}
          onClose={() => {
            setShowModal(false);
            setEditPolicy(undefined);
          }}
          onSuccess={() => {
            refetch();
            setShowModal(false);
            setEditPolicy(undefined);
          }}
        />
      )}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                "escalation.policy.searchPlaceholder",
                "Search policies...",
              )}
              className="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("common.refresh")}
          </Button>
          {isSuperAdmin && (
            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowModal(true)}
            >
              {t("escalation.policy.addNew", "New Policy")}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[hsl(var(--muted-foreground))]">
                {t("common.loading")}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ListChecks className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">
                {t(
                  "escalation.policy.noPolicies",
                  "No escalation policies yet",
                )}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t(
                  "escalation.policy.noPoliciesHint",
                  "Create reusable escalation policies and attach them to workflow states or classification criticalities.",
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    {[
                      "common.name",
                      "escalation.policy.steps",
                      "common.status",
                      "escalation.updatedAt",
                      "common.actions",
                    ].map((key, i, arr) => (
                      <th
                        key={key}
                        className={cn(
                          "px-5 py-3.5",
                          i === arr.length - 1 ? "text-center" : "text-start",
                        )}
                      >
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t(key)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {filtered.map((policy) => (
                    <tr
                      key={policy.id}
                      className="hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                            <ListChecks className="w-4 h-4 text-[hsl(var(--primary))]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                              {policy.name}
                            </p>
                            {policy.description && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-[220px] truncate">
                                {policy.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                          <Clock className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                          {policy.steps?.length ?? 0}{" "}
                          {t("escalation.policy.stepCount", "steps")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge active={policy.is_active} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                          <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                          {formatDate(policy.updated_at)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        {isSuperAdmin && (
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Pencil className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setEditPolicy(policy);
                                setShowModal(true);
                              }}
                            >
                              {t("common.edit")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => setDeleteTarget(policy)}
                            >
                              {t("common.delete")}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Tab: Escalation Groups ───────────────────────────────────────────────────

const GroupsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [page, setPage] = useState(1);
  const LIMIT = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EscalationConfig | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState<any>();

  const canCreate =
    isSuperAdmin || hasPermission(PERMISSIONS.ESCALATION_GROUPS_CREATE);
  const canDelete =
    isSuperAdmin || hasPermission(PERMISSIONS.ESCALATION_GROUPS_DELETE);
  const canUpdate =
    isSuperAdmin || hasPermission(PERMISSIONS.ESCALATION_GROUPS_UPDATE);

  const {
    data: escalationList,
    isLoading,
    refetch,
    error,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "escalations", "list"],
    queryFn: () => escalationApi.list(),
  });

  const escalationData: EscalationConfig[] = escalationList?.data || [];
  const totalItems = escalationData.length;
  const totalPages = Math.ceil(totalItems / LIMIT);

  const filteredEscalations = useMemo(() => {
    if (!searchTerm) return escalationData;
    return escalationData.filter((item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [escalationData, searchTerm]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => escalationApi.delete(id),
    onSuccess: () => {
      toast.success(t("escalation.deletedSuccess"));
      setDeleteTarget(null);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || t("escalation.deleteError"));
    },
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(
      i18n.language === "ar" ? "ar-SA" : "en-US",
      { month: "short", day: "numeric", year: "numeric" },
    );
  };

  if (error && !isLoading) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm text-center">
        <XCircle className="w-10 h-10 text-[hsl(var(--destructive))] mx-auto mb-3" />
        <p className="text-[hsl(var(--muted-foreground))] mb-4">
          {(error as any)?.message}
        </p>
        <Button
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteMutation.isPending}
        />
      )}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder={t("escalation.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("common.refresh")}
          </Button>
          {canCreate && (
            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              {t("escalation.addNew")}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[hsl(var(--muted-foreground))]">
                {t("escalation.loading")}
              </p>
            </div>
          ) : filteredEscalations.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldAlert className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">
                {t("escalation.noGroups")}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                {searchTerm
                  ? t("escalation.noMatch")
                  : t("escalation.noGroupsHint")}
              </p>
              {searchTerm ? (
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  {t("common.clearSearch")}
                </Button>
              ) : canCreate ? (
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowCreateModal(true)}
                >
                  {t("escalation.addNew")}
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                      {[
                        "escalation.name",
                        "escalation.users",
                        "escalation.classification",
                        "escalation.channel",
                        "common.status",
                        "escalation.updatedAt",
                        ...(canUpdate || canDelete ? ["common.actions"] : []),
                      ].map((key, i, arr) => (
                        <th
                          key={key}
                          className={cn(
                            "px-5 py-3.5",
                            i === arr.length - 1 ? "text-center" : "text-start",
                          )}
                        >
                          <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider whitespace-nowrap">
                            {t(key)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {filteredEscalations.map((cfg) => (
                      <tr
                        key={cfg.id}
                        className="hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                              <ShieldAlert className="w-4 h-4 text-[hsl(var(--primary))]" />
                            </div>
                            <span className="text-sm font-semibold text-[hsl(var(--foreground))] max-w-[180px] truncate">
                              {cfg.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {(() => {
                            const directCount = cfg.users?.length ?? 0;
                            const targetCount = cfg.targets?.length ?? 0;
                            if (directCount === 0 && targetCount === 0) {
                              return (
                                <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                                  <Users className="w-3.5 h-3.5" />—
                                </span>
                              );
                            }
                            return (
                              <div className="flex flex-wrap gap-1">
                                {/* Direct users — show first 2 */}
                                {cfg.users?.slice(0, 2).map((u) => (
                                  <span
                                    key={u.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.15)]"
                                  >
                                    {u.first_name
                                      ? `${u.first_name} ${u.last_name ?? ""}`.trim()
                                      : u.username}
                                  </span>
                                ))}
                                {/* Dept/role targets — show first 2 (after direct slots used) */}
                                {cfg.targets
                                  ?.slice(
                                    0,
                                    Math.max(0, 2 - Math.min(directCount, 2)),
                                  )
                                  .map((tgt) => (
                                    <span
                                      key={tgt.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.15)]"
                                    >
                                      <Users className="w-3 h-3 shrink-0" />
                                      {[tgt.department?.name, tgt.role?.name]
                                        .filter(Boolean)
                                        .join(" · ") || "All Users"}
                                    </span>
                                  ))}
                                {/* Combined overflow count */}
                                {directCount + targetCount > 2 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]">
                                    <Users className="w-3 h-3" />+
                                    {directCount + targetCount - 2} more
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-3.5">
                          {cfg.classifications &&
                          cfg.classifications.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {cfg.classifications.slice(0, 2).map((c: any) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] truncate max-w-[100px]"
                                >
                                  <Building2 className="w-3 h-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
                                  {c.name}
                                </span>
                              ))}
                              {cfg.classifications.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]">
                                  +{cfg.classifications.length - 2}
                                </span>
                              )}
                            </div>
                          ) : cfg.classification ? (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                              <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                              <span className="truncate max-w-[130px]">
                                {cfg.classification.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {cfg.channel ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
                              {cfg.channel}
                            </span>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <StatusBadge active={cfg.is_active} />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                            <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                            {formatDate(cfg.updated_at)}
                          </div>
                        </td>
                        {(canUpdate || canDelete) && (
                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            <div className="inline-flex items-center gap-1">
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                  onClick={() => {
                                    setEditData(cfg);
                                    setShowCreateModal(true);
                                  }}
                                >
                                  {t("common.edit")}
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => setDeleteTarget(cfg)}
                                >
                                  {t("common.delete")}
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("common.showingResults", {
                      from: (page - 1) * LIMIT + 1,
                      to: Math.min(page * LIMIT, totalItems),
                      total: totalItems,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--card))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p =
                        totalPages <= 5
                          ? i + 1
                          : page <= 3
                            ? i + 1
                            : page >= totalPages - 2
                              ? totalPages - 4 + i
                              : page - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                            page === p
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                              : "hover:bg-[hsl(var(--card))] border border-transparent hover:border-[hsl(var(--border))]",
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--card))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateEscalationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditData(undefined);
        }}
        onSuccess={() => {
          refetch();
          setShowCreateModal(false);
          setEditData(undefined);
        }}
        editData={editData}
      />
    </>
  );
};

// ─── Tab: Breach Audit Log ────────────────────────────────────────────────────

const BreachLogTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  // TODO: wire up real API endpoint when available
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["escalation-sla-log"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/escalation-sla", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load breach log");
      return res.json();
    },
    retry: false,
  });

  const records = (data?.data || []) as any[];

  const filtered = useMemo(() => {
    if (!search) return records;
    return records.filter(
      (r) =>
        r.incident_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.escalation_type?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [records, search]);

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString(
      i18n.language === "ar" ? "ar-SA" : "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "escalation.breachLog.search",
              "Search by incident or type...",
            )}
            className="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          isLoading={isRefetching}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {t("common.refresh")}
        </Button>
      </div>

      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("common.loading")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">
              {t("escalation.breachLog.noRecords", "No breach records found")}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t(
                "escalation.breachLog.noRecordsHint",
                "Escalation actions fired on SLA breaches will appear here.",
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  {[
                    "escalation.breachLog.incident",
                    "escalation.breachLog.type",
                    "escalation.breachLog.state",
                    "escalation.breachLog.step",
                    "escalation.channel",
                    "escalation.breachLog.sentAt",
                  ].map((key) => (
                    <th key={key} className="px-5 py-3.5 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider whitespace-nowrap">
                        {t(key)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--primary))]">
                        <FileText className="w-3.5 h-3.5" />
                        {r.incident_number || r.incident_id?.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        {r.escalation_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[hsl(var(--foreground))]">
                      {r.state_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[hsl(var(--foreground))]">
                      {r.step_order != null ? `Step ${r.step_order}` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
                        {r.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[hsl(var(--muted-foreground))]">
                      {formatDate(r.sent_at)}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "policies" | "groups" | "breach-log";

const TABS: { id: Tab; labelKey: string; icon: React.ReactNode }[] = [
  {
    id: "policies",
    labelKey: "escalation.tabs.policies",
    icon: <ListChecks className="w-4 h-4" />,
  },
  {
    id: "groups",
    labelKey: "escalation.tabs.groups",
    icon: <Users className="w-4 h-4" />,
  },
  // {
  //   id: "breach-log",
  //   labelKey: "escalation.tabs.breachLog",
  //   icon: <AlertTriangle className="w-4 h-4" />,
  // },
];

export const EscalationConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("policies");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
          <ShieldAlert className="w-5 h-5 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {t("escalation.managementTitle", "Escalation Management")}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {t(
              "escalation.managementDescription",
              "Configure policies, groups, and review SLA breach activity",
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[hsl(var(--border))]">
        <div className="flex gap-1">
          {TABS.map(({ id, labelKey, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === id
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]",
              )}
            >
              {icon}
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "policies" && <PoliciesTab />}
      {activeTab === "groups" && <GroupsTab />}
      {activeTab === "breach-log" && <BreachLogTab />}
    </div>
  );
};

export default EscalationConfigPage;
