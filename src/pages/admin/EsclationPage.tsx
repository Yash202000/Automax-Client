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
} from "lucide-react";
import { Button } from "../../components/ui";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { escalationApi } from "@/api/admin";
import CreateEscalationModal from "@/components/esclation/CreateEscalationModal";
import { TooltipPopover } from "@/components/ui/TooltipPopover";
import { toast } from "sonner";
import usePermissions from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";

interface EscalationUser {
  id: string;
  first_name?: string;
  last_name?: string;
  username: string;
  avatar?: string;
}

interface EscalationConfig {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  classification?: any;
  frequency?: string;
  channel?: string;
  users?: EscalationUser[];
}

const MAX_VISIBLE = 2;

const UserTags = ({ users }: { users?: EscalationUser[] }) => {
  if (!users || users.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
        <Users className="w-3.5 h-3.5" />—
      </span>
    );
  }

  const visible = users.slice(0, MAX_VISIBLE);
  const overflow = users.slice(MAX_VISIBLE);

  const displayName = (u: EscalationUser) =>
    u.first_name ? `${u.first_name} ${u.last_name ?? ""}`.trim() : u.username;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Visible user chips */}
      {visible.map((u) => (
        <span
          key={u.id}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.15)]"
        >
          {displayName(u)}
        </span>
      ))}

      {overflow.length > 0 && (
        <TooltipPopover
          placement="bottom"
          content={
            <div className="py-1">
              {overflow.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                >
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/0.15"
                  >
                    {displayName(u)}
                  </span>
                </div>
              ))}
            </div>
          }
        >
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold cursor-default bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:bg-primary/10 hover:border-primary transition-colors">
            <Users className="w-3 h-3" />+{overflow.length}
          </span>
        </TooltipPopover>
      )}
    </div>
  );
};

// ─── DeleteModal ──────────────────────────────────────────────────────────────

const DeleteModal: React.FC<{
  item: EscalationConfig;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ item, onConfirm, onCancel, isLoading }) => {
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
              {t("escalation.deleteDescription", { name: item.name })}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export const EscalationConfigPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [page, setPage] = useState(1);
  const LIMIT = 10;
  const [searchTerm, setSearchTerm] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<EscalationConfig | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState();

  const canCreateEscalation =
    isSuperAdmin || hasPermission(PERMISSIONS.ESCALATION_GROUPS_CREATE);
  const canDeleteEscalation =
    isSuperAdmin || hasPermission(PERMISSIONS.ESCALATION_GROUPS_DELETE);
  const canUpdateEscalation =
    isSuperAdmin || hasPermission(PERMISSIONS.ESCALATION_GROUPS_UPDATE);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
  };

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

  const escalationData = escalationList?.data || [];
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

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(
      i18n.language === "ar" ? "ar-SA" : "en-US",
      { month: "short", day: "numeric", year: "numeric" },
    );
  };

  const columns = [
    { key: "escalation.name" },
    { key: "escalation.users" },
    { key: "escalation.classification" },
    { key: "escalation.channel" },
    { key: "common.status" },
    { key: "escalation.updatedAt" },
    ...(canUpdateEscalation || canDeleteEscalation
      ? [{ key: "common.actions" }]
      : []),
  ];

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !isLoading) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            {t("escalation.failedToLoad", "Failed to Load")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            {(error as any)?.message}
          </p>
          <Button
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("common.tryAgain", "Try Again")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteMutation.isPending}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
                <ShieldAlert className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {t("escalation.pageTitle")}
              </h1>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
              {t("escalation.pageDescription")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              isLoading={isRefetching}
              leftIcon={
                !isLoading ? <RefreshCw className="w-4 h-4" /> : undefined
              }
            >
              {t("common.refresh")}
            </Button>
            {canCreateEscalation ? (
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                {t("escalation.addNew")}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Search */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input
              type="text"
              placeholder={t("escalation.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
                <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-[hsl(var(--muted-foreground))]">
                {t("escalation.loading")}
              </p>
            </div>
          ) : filteredEscalations?.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl mb-4">
                <ShieldAlert className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                {t("escalation.noGroups")}
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                {searchTerm
                  ? t("escalation.noMatch")
                  : t("escalation.noGroupsHint")}
              </p>
              {searchTerm ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                  }}
                >
                  {t("common.clearSearch")}
                </Button>
              ) : canCreateEscalation ? (
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
                  {/* ── Head ── */}
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                      {columns.map(({ key }, i) => (
                        <th
                          key={key}
                          className={cn(
                            "px-5 py-3.5",
                            i === columns.length - 1
                              ? "text-center"
                              : "text-start",
                          )}
                        >
                          <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider whitespace-nowrap">
                            {t(key)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* ── Body ── */}
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(filteredEscalations || []).map((cfg) => (
                      <tr
                        key={cfg.id}
                        className="hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
                      >
                        {/* Name */}
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

                        {/* Users */}
                        <td className="px-5 py-3.5">
                          <UserTags users={cfg.users} />
                        </td>

                        {/* Classification */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {cfg.classification ? (
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

                        {/* Channel */}
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

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                              cfg.is_active
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                cfg.is_active
                                  ? "bg-green-500"
                                  : "bg-[hsl(var(--muted-foreground))]",
                              )}
                            />
                            {cfg.is_active
                              ? t("escalation.active")
                              : t("escalation.inactive")}
                          </span>
                        </td>

                        {/* Updated */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                            <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                            {formatDate(cfg.updated_at)}
                          </div>
                        </td>

                        {/* Actions */}
                        {canUpdateEscalation || canDeleteEscalation ? (
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              {canUpdateEscalation ? (
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
                              ) : null}
                              {canDeleteEscalation ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => setDeleteTarget(cfg)}
                                >
                                  {t("common.delete")}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
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
                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (page <= 3) pageNum = i + 1;
                          else if (page >= totalPages - 2)
                            pageNum = totalPages - 4 + i;
                          else pageNum = page - 2 + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={cn(
                                "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                                page === pageNum
                                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                                  : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] border border-transparent hover:border-[hsl(var(--border))]",
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        onClose={() => {
          setShowCreateModal(false);
          setEditData(undefined);
        }}
        isOpen={showCreateModal}
        onSuccess={() => {
          refetch();
          setEditData(undefined);
          setShowCreateModal(false);
        }}
        editData={editData}
      />
    </>
  );
};

export default EscalationConfigPage;
