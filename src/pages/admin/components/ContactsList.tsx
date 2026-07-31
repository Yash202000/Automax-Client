import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Mail,
  Building2,
  MapPin,
  Phone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Crown,
  X,
  Filter,
  Shield,
  Check,
} from "lucide-react";
import {
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalTitle,
} from "../../../components/ui";
import { roleApi, userApi } from "../../../api/admin";
import type { User } from "../../../types";
import { cn } from "@/lib/utils";
import CallablePhone from "@/components/common/CallablePhone";
import { CallHistory } from "./CallHistory";
import usePermissions from "@/hooks/usePermissions";
import { useDebounce } from "@/hooks/useDebounce";
import { PERMISSIONS } from "@/constants/permissions";

interface ContactsListProps {
  variant?: "default" | "call-centre";
}

export const ContactsList: React.FC<ContactsListProps> = ({
  variant = "default",
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;
  const [openCallLogs, setOpenCallLogs] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any>();
  const { hasPermission } = usePermissions();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterRoleIds, setFilterRoleIds] = useState<string[]>([]);

  const viewAllCallLogs = hasPermission(PERMISSIONS.VIEW_ALL_CALL_LOGS);

  const debouncedSearch = useDebounce(search, 600);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "users", page, limit, debouncedSearch, filterRoleIds],
    queryFn: () => userApi.list(page, limit, debouncedSearch, filterRoleIds),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => roleApi.list(),
  });

  const filteredUsers = data?.data;

  const totalPages = data?.total_pages ?? 1;

  const toggleRoleId = async (id: string) => {
    const wasSelected = filterRoleIds.includes(id);
    const newIds = wasSelected
      ? filterRoleIds.filter((x) => x !== id)
      : [...filterRoleIds, id];
    setFilterRoleIds(newIds);
    setPage(1);
  };

  const activeFilterCount = filterRoleIds.length;

  const clearAllFilters = () => {
    setFilterRoleIds([]);

    setPage(1);
  };

  const getUserStatus = (userId: string) => {
    const lastChar = userId.charCodeAt(userId.length - 1);
    if (lastChar % 3 === 0) return "online";
    if (lastChar % 3 === 1) return "offline";
    return "in-call";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500 border-white";
      case "in-call":
        return "bg-red-500 border-white";
      case "offline":
      default:
        return "bg-slate-300 border-white";
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="text-rose-500 mb-4">
            <UserIcon className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {t("users.failedToLoad")}
          </h3>
          <Button
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("common.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input
              type="text"
              placeholder={t("callCentre.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                isFilterOpen || activeFilterCount > 0
                  ? "bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))]"
                  : "bg-transparent border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
              )}
            >
              <Filter className="w-4 h-4" />
              {t("common.filter")}
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg border border-transparent transition-all"
              >
                <X className="w-3.5 h-3.5" />
                {t("common.clear")}
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={
                !isFetching ? <RefreshCw className="w-4 h-4" /> : undefined
              }
            >
              {t("common.refresh")}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div className="border-t border-[hsl(var(--border))] p-5 space-y-5">
            {/* Roles — flat chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> {t("users.roles")}
                  {filterRoleIds.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded">
                      {filterRoleIds.length}
                    </span>
                  )}
                </p>
                {filterRoleIds.length > 0 && (
                  <button
                    onClick={() => {
                      setFilterRoleIds([]);
                      setPage(1);
                    }}
                    className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    {t("common.clear")}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {rolesData?.data?.map((role: any) => (
                  <button
                    key={role.id}
                    onClick={() => toggleRoleId(role.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      filterRoleIds.includes(role.id)
                        ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]"
                        : "bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
                    )}
                  >
                    {filterRoleIds.includes(role.id) && (
                      <Check className="inline w-3 h-3 mr-1" />
                    )}
                    {role.is_department_manager && (
                      <Crown className="inline w-3 h-3 mr-1 text-indigo-500" />
                    )}
                    {role.name}
                  </button>
                ))}
                {!rolesData?.data?.length && (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("users.noRolesAvailable")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-500">{t("users.loadingUsers")}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("users.user")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("users.phone")}
                      </span>
                    </th>
                    {variant === "call-centre" && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {t("users.extension")}
                        </span>
                      </th>
                    )}
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("users.email")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("users.department")}
                      </span>
                    </th>
                    {variant !== "call-centre" && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {t("users.location")}
                        </span>
                      </th>
                    )}
                    {variant === "call-centre" && (
                      <th className="px-6 py-4 text-center">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {t("users.actions")}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers?.map((user: User) => (
                    <tr
                      key={user.id}
                      className="dark:hover:bg-slate-50/10 hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-white shadow-sm">
                                <span className="text-white text-sm font-bold">
                                  {user.first_name?.[0] || user.username[0]}
                                </span>
                              </div>
                            )}
                            {variant === "call-centre" && (
                              <div
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${getStatusColor(getUserStatus(user.id))}`}
                              />
                            )}
                          </div>
                          <div
                            onClick={() => {
                              if (!viewAllCallLogs) return;

                              setOpenCallLogs(true);
                              setSelectedUser(user);
                            }}
                          >
                            <p
                              className={`text-sm font-semibold ${
                                viewAllCallLogs
                                  ? "cursor-pointer hover:underline hover:text-primary"
                                  : ""
                              }`}
                            >
                              {user.first_name} {user.last_name}
                            </p>
                            <p
                              className={`text-sm text-slate-500 ${
                                viewAllCallLogs
                                  ? "cursor-pointer hover:underline hover:text-primary"
                                  : ""
                              }`}
                            >
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.phone ? (
                          <CallablePhone
                            number={user.phone}
                            className="text-sm font-medium"
                          />
                        ) : (
                          <span className="text-sm text-slate-400 italic">
                            {t("users.noPhone")}
                          </span>
                        )}
                      </td>
                      {variant === "call-centre" && (
                        <td className="px-6 py-4">
                          {(user as any).extension ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-lg border border-violet-200">
                              <Phone className="w-3 h-3" />
                              Ext.{" "}
                              <CallablePhone
                                number={(user as any).extension}
                                showIcon={false}
                              />
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.departments && user.departments.length > 0 ? (
                            <>
                              {user.departments.slice(0, 2).map((dept) => (
                                <span
                                  key={dept.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/5 text-primary rounded-lg border border-primary/50"
                                >
                                  <Building2 className="w-3 h-3" />
                                  {dept.name}
                                </span>
                              ))}
                              {user.departments.length > 2 && (
                                <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                                  +{user.departments.length - 2}
                                </span>
                              )}
                            </>
                          ) : user.department ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                              <Building2 className="w-3 h-3" />
                              {user.department.name}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      {variant !== "call-centre" && (
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.locations && user.locations.length > 0 ? (
                              <>
                                {user.locations.slice(0, 2).map((loc) => (
                                  <span
                                    key={loc.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    {loc.name}
                                  </span>
                                ))}
                                {user.locations.length > 2 && (
                                  <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                                    +{user.locations.length - 2}
                                  </span>
                                )}
                              </>
                            ) : user.location ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                <MapPin className="w-3 h-3" />
                                {user.location.name}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                      )}
                      {variant === "call-centre" && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              const extension =
                                (user as any).extension || user.phone;
                              if (extension) {
                                window.dispatchEvent(
                                  new CustomEvent("initiate-call", {
                                    detail: { number: extension },
                                  }),
                                );
                              }
                            }}
                            disabled={!(user as any).extension && !user.phone}
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                            title={
                              (user as any).extension
                                ? `Call ext. ${(user as any).extension}`
                                : user.phone
                                  ? `Call ${user.phone}`
                                  : "No extension"
                            }
                          >
                            <Phone className="w-4 h-4" />
                            {(user as any).extension && (
                              <span className="text-xs font-medium">
                                Ext. {(user as any).extension}
                              </span>
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredUsers?.length === 0 && (
                    <tr>
                      <td
                        colSpan={variant === "call-centre" ? 6 : 5}
                        className="py-12 text-center text-slate-500"
                      >
                        {t("users.noUsersFound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredUsers && filteredUsers.length > 0 && (
              <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-card">
                <p className="text-sm text-slate-500">
                  {t("common.showing")}{" "}
                  <span className="font-semibold text-black dark:text-white">
                    {(page - 1) * limit + 1}
                  </span>{" "}
                  {t("users.to")}{" "}
                  <span className="font-semibold text-black dark:text-white">
                    {Math.min(page * limit, data?.total_items || 0)}
                  </span>{" "}
                  {t("common.of")}{" "}
                  <span className="font-semibold text-black dark:text-white">
                    {data?.total_items || 0}
                  </span>{" "}
                  {t("users.users")}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                            page === pageNum
                              ? "bg-linear-to-r from-primary to-accent text-white shadow-lg shadow-primary/30"
                              : "text-slate-600 hover:bg-white hover:shadow-sm",
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Modal
        size="4xl"
        isOpen={openCallLogs}
        onOpenChange={setOpenCallLogs}
        onClose={() => setOpenCallLogs(false)}
      >
        <ModalHeader>
          <ModalTitle>
            Call History of{" "}
            {[selectedUser?.first_name, selectedUser?.last_name]
              .filter(Boolean)
              .join(" ") || selectedUser?.username}
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="max-h-[70vh]">
          <CallHistory userId={selectedUser?.id} />
        </ModalBody>
      </Modal>
    </div>
  );
};
