import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Edit2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  X,
  Truck,
  Layers,
  Building2,
  type LucideIcon,
} from "lucide-react";
import {
  unitTypeApi,
  servicePointApi,
  resourceApi,
  UNIT_STATUS_KEYS,
  RESOURCE_STATUSES,
  type ServicePoint,
  type Resource,
  type ResourceStatus,
  type UnitType,
} from "../../api/dispatcher";
import { DispatchIcon } from "./DispatchIcon";
import { Button, Select, TreeSelect, type TreeNode } from "../../components/ui";
import { DatePicker } from "../../components/ui/Datepicker";
import {
  userApi,
  locationApi,
  classificationApi,
  departmentApi,
} from "../../api/admin";
import type { User } from "../../types";
import { ConfirmationModal } from "../../components/common/ConfirmationModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "./apiError";
import { STATUS_LABELS } from "./unitStatus";
import type { TreeSelectNode } from "../../utils/treeUtils";

export type UnitManagementKind = "units" | "unitTypes" | "fireStations";

const PAGE_SIZE = 10;

// ─────────────────── Shared Users-style table shell ───────────────────

const Th: React.FC<{ children?: React.ReactNode; actions?: boolean }> = ({
  children,
  actions,
}) => (
  <th
    className={cn(
      "px-6 py-4",
      actions
        ? "sticky end-0 z-10 bg-[hsl(var(--card))] text-end"
        : "text-start",
    )}
  >
    <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
      {children}
    </span>
  </th>
);

/** Hover "…" button in the sticky actions column, opening an Edit/Delete menu. */
const RowActions: React.FC<{
  id: string;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ id, onEdit, onDelete }) => {
  const { t, i18n } = useTranslation();
  const [pos, setPos] = useState<{
    top: number;
    right: number;
    left: number;
  } | null>(null);

  const toggle = () => {
    if (pos) return setPos(null);
    const rect = document
      .getElementById(`action-btn-${id}`)
      ?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        left: rect.left,
      });
    }
  };

  return (
    <td className="sticky end-0 z-10 bg-[hsl(var(--card))] group-hover:bg-[hsl(var(--muted))] px-6 py-4 text-end transition-colors">
      <button
        id={`action-btn-${id}`}
        onClick={toggle}
        className={cn(
          "p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-opacity",
          pos
            ? "opacity-100"
            : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
        )}
      >
        <MoreHorizontal className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
      </button>
      {pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setPos(null)}
            />
            <div
              className="fixed w-48 bg-[hsl(var(--card))] rounded-xl shadow-xl border border-[hsl(var(--border))] py-1.5 z-[70] animate-scale-in origin-top-right text-start"
              style={{
                top: pos.top,
                ...(i18n.language === "ar"
                  ? { left: pos.left }
                  : { right: pos.right }),
              }}
            >
              <button
                onClick={() => {
                  setPos(null);
                  onEdit();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {t("common.edit", "Edit")}
              </button>
              <div className="my-1 border-t border-[hsl(var(--border))]" />
              <button
                onClick={() => {
                  setPos(null);
                  onDelete();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t("common.delete", "Delete")}
              </button>
            </div>
          </>,
          document.body,
        )}
    </td>
  );
};

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => {
  const { t } = useTranslation();
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-full">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {t("unitManagement.active", "Active")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
      <XCircle className="w-3.5 h-3.5" />
      {t("unitManagement.inactive", "Inactive")}
    </span>
  );
};

const TableShell: React.FC<{
  icon: LucideIcon;
  title: string;
  subtitle: string;
  addLabel: string;
  onAdd: () => void;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  total: number;
  page: number;
  // eslint-disable-next-line no-unused-vars
  onPageChange: (_page: number) => void;
  search: string;
  // eslint-disable-next-line no-unused-vars
  onSearch: (_value: string) => void;
  filterPanel?: React.ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  head: React.ReactNode;
  children: React.ReactNode;
}> = ({
  icon: Icon,
  title,
  subtitle,
  addLabel,
  onAdd,
  isLoading,
  isFetching,
  onRefresh,
  total,
  page,
  onPageChange,
  search,
  onSearch,
  filterPanel,
  activeFilterCount = 0,
  onClearFilters,
  head,
  children,
}) => {
  const { t } = useTranslation();
  const [filterOpen, setFilterOpen] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Icon className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {title}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ms-12">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3">
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd}>
            {addLabel}
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input
              type="text"
              placeholder={t("common.search", "Search") + "..."}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full ps-12 pe-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
          <div className="flex items-center gap-2">
            {filterPanel && (
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                  filterOpen || activeFilterCount > 0
                    ? "bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))]"
                    : "bg-transparent border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
                )}
              >
                <Filter className="w-4 h-4" />
                {t("common.filter", "Filter")}
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={onClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg border border-transparent transition-all"
              >
                <X className="w-3.5 h-3.5" />
                {t("common.clear", "Clear")}
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              isLoading={isFetching}
              leftIcon={
                !isFetching ? <RefreshCw className="w-4 h-4" /> : undefined
              }
            >
              {t("common.refresh", "Refresh")}
            </Button>
          </div>
        </div>
        {filterPanel && filterOpen && (
          <div className="border-t border-[hsl(var(--border))] p-5 space-y-5">
            {filterPanel}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("common.loading", "Loading...")}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    {head}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {children}
                </tbody>
              </table>
              {total === 0 && (
                <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  {t("unitManagement.noRecords", "No records found")}
                </p>
              )}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t("unitManagement.showing", "Showing")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {Math.min(page * PAGE_SIZE, total)}
                </span>{" "}
                {t("unitManagement.of", "of")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {total}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 rtl:-rotate-180" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum =
                      totalPages <= 5 || page <= 3
                        ? i + 1
                        : page >= totalPages - 2
                          ? totalPages - 4 + i
                          : page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={cn(
                          "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                          page === pageNum
                            ? "bg-linear-to-br from-primary to-accent text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] border border-transparent",
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rtl:-rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const cell = "px-6 py-4 text-sm text-[hsl(var(--foreground))]";
const mutedCell = "px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]";
const rowCls = "hover:bg-[hsl(var(--muted)/0.5)] transition-colors group";

const useDebouncedValue = <T,>(value: T, ms: number): T => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
};

const toTreeNodes = (data: unknown[] = []): TreeNode[] =>
  data.map((item) => {
    const n = item as {
      id: string;
      name: string;
      name_ar?: string;
      types?: string[];
      children?: unknown[];
    };
    return {
      id: n.id,
      name: n.name,
      name_ar: n.name_ar ?? undefined,
      types: n.types,
      children: n.children ? toTreeNodes(n.children) : undefined,
    };
  });

const asTreeSelect = (nodes: TreeNode[]) =>
  nodes as unknown as TreeSelectNode[];

/** Shared "Department" tree used by the Unit Types and Fire Stations filters. */
const useDepartmentsTree = () => {
  const { data } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });
  return useMemo(() => asTreeSelect(toTreeNodes(data?.data)), [data?.data]);
};

const statusOptions = (
  // eslint-disable-next-line no-unused-vars
  t: (_key: string, _default: string) => string,
) => [
  { value: "true", label: t("unitManagement.active", "Active") },
  { value: "false", label: t("unitManagement.inactive", "Inactive") },
];

// ───────────────────────────── Units ─────────────────────────────

const UnitsTable: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fDate, setFDate] = useState<Date | undefined>();
  const [fDriver, setFDriver] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fClassification, setFClassification] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data: driversData } = useQuery({
    queryKey: ["admin", "users", "dispatcher-drivers"],
    queryFn: () => userApi.list(1, 100),
  });
  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });
  const { data: classificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });
  const { data: unitTypes = [] } = useQuery({
    queryKey: ["dispatcher", "unit-types", "all"],
    queryFn: unitTypeApi.all,
  });
  const drivers: User[] = driversData?.data ?? [];
  const locationsTree = useMemo(
    () => asTreeSelect(toTreeNodes(locationsData?.data)),
    [locationsData?.data],
  );
  const classificationsTree = useMemo(
    () => asTreeSelect(toTreeNodes(classificationsData?.data)),
    [classificationsData?.data],
  );
  const typeName = useMemo(
    () => new Map(unitTypes.map((x) => [x.id, x.name])),
    [unitTypes],
  );

  const dateParam = fDate ? format(fDate, "yyyy-MM-dd") : undefined;
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "dispatcher",
      "units",
      "list",
      page,
      debouncedSearch,
      fType,
      dateParam,
      fDriver,
      fLocation,
      fClassification,
      fStatus,
    ],
    queryFn: () =>
      resourceApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        resource_type_id: fType || undefined,
        active_till_date: dateParam,
        driver_user_id: fDriver || undefined,
        location_id: fLocation || undefined,
        classification_id: fClassification || undefined,
        status: (fStatus || undefined) as ResourceStatus | undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const rows = data?.data ?? [];
  const total = data?.total_items ?? rows.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourceApi.remove(id),
    onSuccess: () => {
      setDeleting(null);
      toast.success(t("unitManagement.deleted", "Deleted successfully"));
      queryClient.invalidateQueries({ queryKey: ["dispatcher", "units"] });
    },
    onError: (e) => {
      setDeleting(null);
      toast.error(
        apiErrorMessage(
          e,
          t("unitManagement.deleteFailed", "Could not delete"),
        ),
      );
    },
  });

  const activeFilterCount =
    [fType, fDriver, fLocation, fClassification, fStatus].filter(Boolean)
      .length + (fDate ? 1 : 0);
  const clearFilters = () => {
    setFType("");
    setFDate(undefined);
    setFDriver("");
    setFLocation("");
    setFClassification("");
    setFStatus("");
    setPage(1);
  };
  const reset =
    // eslint-disable-next-line no-unused-vars
    <T,>(setter: (_value: T) => void) =>
      (v: T) => {
        setter(v);
        setPage(1);
      };

  const driverName = (u: User) =>
    `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username;
  const openForm = (unit?: Resource) =>
    navigate(
      unit
        ? `/unit-management/units/${unit.id}/edit`
        : "/unit-management/units/new",
    );

  return (
    <>
      <TableShell
        icon={Truck}
        title={t("sidebar.units", "Units")}
        subtitle={t("unitManagement.unitsSubtitle", "Manage dispatch units")}
        addLabel={t("unitManagement.addUnit", "Add Unit")}
        onAdd={() => openForm()}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        total={total}
        page={page}
        onPageChange={setPage}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        filterPanel={
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label={t("unitManagement.unitType", "Unit Type")}
                value={fType}
                onChange={(e) => reset(setFType)(e.target.value)}
                placeholder={t("common.all", "All")}
                options={unitTypes.map((x) => ({ value: x.id, label: x.name }))}
              />
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("unitManagement.activeTillDate", "Active Till Date")}
                </label>
                <DatePicker
                  value={fDate}
                  onChange={reset(setFDate)}
                  placeholder={t(
                    "unitManagement.activeTillDate",
                    "Active Till Date",
                  )}
                />
              </div>
              <Select
                label={t("unitManagement.driver", "Driver")}
                value={fDriver}
                onChange={(e) => reset(setFDriver)(e.target.value)}
                placeholder={t("common.all", "All")}
                options={drivers.map((d) => ({
                  value: d.id,
                  label: driverName(d),
                }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TreeSelect
                label={t("unitManagement.location", "Location")}
                data={locationsTree}
                value={fLocation}
                onChange={reset(setFLocation)}
                placeholder={t("common.all", "All")}
              />
              <TreeSelect
                label={t("unitManagement.classification", "Classification")}
                data={classificationsTree}
                value={fClassification}
                onChange={reset(setFClassification)}
                placeholder={t("common.all", "All")}
              />
              <Select
                label={t("unitManagement.status", "Status")}
                value={fStatus}
                onChange={(e) => reset(setFStatus)(e.target.value)}
                placeholder={t("common.all", "All")}
                options={RESOURCE_STATUSES.map((s) => ({
                  value: s,
                  label: t(`unitManagement.resStatus.${s}`, s),
                }))}
              />
            </div>
          </>
        }
        head={
          <>
            <Th>{t("unitManagement.unitName", "Unit Name")}</Th>
            <Th>{t("unitManagement.unitId", "Unit ID")}</Th>
            <Th>{t("unitManagement.alternateName", "Alternate Name")}</Th>
            <Th>{t("unitManagement.plateNumber", "Plate Number")}</Th>
            <Th>{t("unitManagement.unitType", "Unit Type")}</Th>
            <Th>{t("unitManagement.radioId", "Radio ID")}</Th>
            <Th>{t("unitManagement.modifiedDate", "Modified Date")}</Th>
            <Th actions>{t("common.actions", "Actions")}</Th>
          </>
        }
      >
        {rows.map((u) => (
          <tr key={u.id} className={rowCls}>
            <td className={`${cell} font-semibold`}>{u.name}</td>
            <td className={cell}>{u.unit_code || "—"}</td>
            <td className={mutedCell}>{u.alternate_name || "—"}</td>
            <td className={cell}>{u.plate_number || "—"}</td>
            <td className={cell}>{typeName.get(u.resource_type_id) ?? "—"}</td>
            <td className={cell}>{u.radio_id || "—"}</td>
            <td className={mutedCell}>
              {u.updated_at
                ? new Date(u.updated_at).toLocaleDateString(i18n.language)
                : "—"}
            </td>
            <RowActions
              id={u.id}
              onEdit={() => openForm(u)}
              onDelete={() => setDeleting(u)}
            />
          </tr>
        ))}
      </TableShell>

      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title={t("unitManagement.deleteUnit", "Delete Unit")}
        message={t(
          "unitManagement.deleteUnitMessage",
          "Are you sure you want to delete this unit?",
        )}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};

// ───────────────────────────── Unit types ─────────────────────────────

const UnitTypesTable: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [deleting, setDeleting] = useState<UnitType | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const departmentsTree = useDepartmentsTree();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "dispatcher",
      "unit-types",
      "list",
      page,
      debouncedSearch,
      fDepartment,
      fStatus,
    ],
    queryFn: () =>
      unitTypeApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        department_id: fDepartment || undefined,
        is_active: fStatus === "" ? undefined : fStatus === "true",
      }),
    placeholderData: keepPreviousData,
  });
  const rows = data?.data ?? [];
  const total = data?.total_items ?? rows.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitTypeApi.remove(id),
    onSuccess: () => {
      setDeleting(null);
      toast.success(t("unitManagement.deleted", "Deleted successfully"));
      queryClient.invalidateQueries({ queryKey: ["dispatcher", "unit-types"] });
    },
    onError: (e) => {
      setDeleting(null);
      toast.error(
        apiErrorMessage(
          e,
          t(
            "unitManagement.deleteFailed",
            "Could not delete this unit type. A unit may still use it.",
          ),
        ),
      );
    },
  });

  const activeFilterCount = (fDepartment ? 1 : 0) + (fStatus ? 1 : 0);
  const clearFilters = () => {
    setFDepartment("");
    setFStatus("");
    setPage(1);
  };
  const openForm = (x?: UnitType) =>
    navigate(
      x
        ? `/unit-management/unit-types/${x.id}/edit`
        : "/unit-management/unit-types/new",
    );

  return (
    <>
      <TableShell
        icon={Layers}
        title={t("sidebar.unitTypes", "Unit Types")}
        subtitle={t("unitManagement.unitTypesSubtitle", "Manage unit types")}
        addLabel={t("unitManagement.addUnitType", "Add Unit Type")}
        onAdd={() => openForm()}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        total={total}
        page={page}
        onPageChange={setPage}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        filterPanel={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TreeSelect
              label={t("unitManagement.department", "Department")}
              data={departmentsTree}
              value={fDepartment}
              onChange={(v) => {
                setFDepartment(v);
                setPage(1);
              }}
              placeholder={t("common.all", "All")}
            />
            <Select
              label={t("unitManagement.status", "Status")}
              value={fStatus}
              onChange={(e) => {
                setFStatus(e.target.value);
                setPage(1);
              }}
              placeholder={t("common.all", "All")}
              options={statusOptions(t)}
            />
          </div>
        }
        head={
          <>
            <Th>{t("unitManagement.unitTypeName", "Unit Type Name")}</Th>
            <Th>{t("unitManagement.maxSpeedLabel", "Maximum Speed")}</Th>
            <Th>{t("unitManagement.statusColors", "Status Colors")}</Th>
            <Th actions>{t("common.actions", "Actions")}</Th>
          </>
        }
      >
        {rows.map((x) => (
          <tr key={x.id} className={rowCls}>
            <td className={`${cell} font-semibold`}>
              <div className="flex items-center gap-3">
                <DispatchIcon path={x.icon} fallback={Truck} />
                {x.name}
              </div>
            </td>
            <td className={cell}>{x.max_speed ?? 0} km/h</td>
            <td className="px-6 py-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 min-w-[320px]">
                {UNIT_STATUS_KEYS.map((k) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-[hsl(var(--border))]"
                      style={{ backgroundColor: x.colors?.[k] }}
                    />
                    <span className="text-[hsl(var(--muted-foreground))]">
                      →
                    </span>
                    <span className="font-medium text-[hsl(var(--foreground))]">
                      {t(...STATUS_LABELS[k])}
                    </span>
                  </div>
                ))}
              </div>
            </td>
            <RowActions
              id={x.id}
              onEdit={() => openForm(x)}
              onDelete={() => setDeleting(x)}
            />
          </tr>
        ))}
      </TableShell>

      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title={t("unitManagement.deleteUnitType", "Delete Unit Type")}
        message={t(
          "unitManagement.deleteUnitTypeMessage",
          "Are you sure you want to delete this unit type?",
        )}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};

// ───────────────────────── Fire stations ─────────────────────────

const FireStationsTable: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [deleting, setDeleting] = useState<ServicePoint | null>(null);
  // Set when the first delete returned 409 (units still assigned).
  const [forceTarget, setForceTarget] = useState<ServicePoint | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const departmentsTree = useDepartmentsTree();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "dispatcher",
      "fire-stations",
      "list",
      page,
      debouncedSearch,
      fDepartment,
      fStatus,
    ],
    queryFn: () =>
      servicePointApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        department_id: fDepartment || undefined,
        is_active: fStatus === "" ? undefined : fStatus === "true",
      }),
    placeholderData: keepPreviousData,
  });
  const rows = data?.data ?? [];
  const total = data?.total_items ?? rows.length;

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      servicePointApi.remove(id, force),
    onSuccess: () => {
      setDeleting(null);
      setForceTarget(null);
      toast.success(t("unitManagement.deleted", "Deleted successfully"));
      queryClient.invalidateQueries({ queryKey: ["dispatcher"] });
    },
    onError: (e, vars) => {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 409 && !vars.force) {
        setForceTarget(deleting);
        setDeleting(null);
        return;
      }
      setDeleting(null);
      setForceTarget(null);
      toast.error(
        apiErrorMessage(
          e,
          t("unitManagement.deleteFailed", "Could not delete"),
        ),
      );
    },
  });

  const activeFilterCount = (fDepartment ? 1 : 0) + (fStatus ? 1 : 0);
  const clearFilters = () => {
    setFDepartment("");
    setFStatus("");
    setPage(1);
  };
  const openForm = (fs?: ServicePoint) =>
    navigate(
      fs
        ? `/unit-management/fire-stations/${fs.id}/edit`
        : "/unit-management/fire-stations/new",
    );

  return (
    <>
      <TableShell
        icon={Building2}
        title={t("sidebar.fireStations", "Fire Stations")}
        subtitle={t(
          "unitManagement.fireStationsSubtitle",
          "Manage fire stations",
        )}
        addLabel={t("unitManagement.addFireStation", "Add Fire Station")}
        onAdd={() => openForm()}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        total={total}
        page={page}
        onPageChange={setPage}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        filterPanel={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TreeSelect
              label={t("unitManagement.department", "Department")}
              data={departmentsTree}
              value={fDepartment}
              onChange={(v) => {
                setFDepartment(v);
                setPage(1);
              }}
              placeholder={t("common.all", "All")}
            />
            <Select
              label={t("unitManagement.status", "Status")}
              value={fStatus}
              onChange={(e) => {
                setFStatus(e.target.value);
                setPage(1);
              }}
              placeholder={t("common.all", "All")}
              options={statusOptions(t)}
            />
          </div>
        }
        head={
          <>
            <Th>{t("unitManagement.fireStationName", "Fire Station Name")}</Th>
            <Th>{t("unitManagement.latitude", "Latitude")}</Th>
            <Th>{t("unitManagement.longitude", "Longitude")}</Th>
            <Th>{t("unitManagement.status", "Status")}</Th>
            <Th actions>{t("common.actions", "Actions")}</Th>
          </>
        }
      >
        {rows.map((fs) => (
          <tr key={fs.id} className={rowCls}>
            <td className={`${cell} font-semibold`}>
              <div className="flex items-center gap-3">
                <DispatchIcon path={fs.icon} fallback={Building2} />
                {i18n.language === "ar" && fs.alt_name ? fs.alt_name : fs.name}
              </div>
            </td>
            <td className={cell}>{fs.location?.lat}</td>
            <td className={cell}>{fs.location?.lng}</td>
            <td className="px-6 py-4">
              <StatusBadge active={fs.is_active ?? true} />
            </td>
            <RowActions
              id={fs.id}
              onEdit={() => openForm(fs)}
              onDelete={() => setDeleting(fs)}
            />
          </tr>
        ))}
      </TableShell>

      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && deleteMutation.mutate({ id: deleting.id, force: false })
        }
        title={t("unitManagement.deleteFireStation", "Delete Fire Station")}
        message={t(
          "unitManagement.deleteFireStationMessage",
          "Are you sure you want to delete this fire station?",
        )}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
        isLoading={deleteMutation.isPending}
      />
      <ConfirmationModal
        isOpen={!!forceTarget}
        onClose={() => setForceTarget(null)}
        onConfirm={() =>
          forceTarget &&
          deleteMutation.mutate({ id: forceTarget.id, force: true })
        }
        title={t("unitManagement.deleteFireStation", "Delete Fire Station")}
        message={t(
          "unitManagement.forceDeleteMessage",
          "Units are still assigned to this fire station. Detach all of them and delete the station?",
        )}
        confirmText={t("unitManagement.detachAndDelete", "Detach and delete")}
        cancelText={t("common.cancel", "Cancel")}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};

// ───────────────────────────── Page ─────────────────────────────

export const UnitManagementPage: React.FC<{ kind: UnitManagementKind }> = ({
  kind,
}) => {
  if (kind === "units") return <UnitsTable />;
  if (kind === "unitTypes") return <UnitTypesTable />;
  return <FireStationsTable />;
};
