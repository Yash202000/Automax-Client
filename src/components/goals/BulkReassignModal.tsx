import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, UserRoundPen, Loader2, Search } from "lucide-react";
import type { Goal, BulkActionResponse } from "../../types/goal";
import { useBulkAction } from "../../hooks/useGoals";
import { userApi } from "../../api/admin";

interface UserSearchResult {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
}

interface BulkReassignModalProps {
  selectedGoals: Goal[];
  onClose: () => void;
  onComplete: () => void;
}

export const BulkReassignModal: React.FC<BulkReassignModalProps> = ({
  selectedGoals,
  onClose,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [result, setResult] = useState<BulkActionResponse | null>(null);
  const bulkAction = useBulkAction();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        const response = await userApi.list(1, 20, debouncedSearch);
        setSearchResults(response.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetchUsers();
  }, [debouncedSearch]);

  const handleConfirm = () => {
    if (!selectedUser) return;
    bulkAction.mutate(
      {
        goal_ids: selectedGoals.map((g) => g.id),
        action: "reassign",
        new_owner_id: selectedUser.id,
      },
      {
        onSuccess: (data) => {
          setResult(data.data!);
          onComplete();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("goals.components.bulk.reassignModal.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedGoals.length === 1
                  ? t("goals.components.bulk.reassignModal.introOne", {
                      count: selectedGoals.length,
                    })
                  : t("goals.components.bulk.reassignModal.introMany", {
                      count: selectedGoals.length,
                    })}
              </p>

              {selectedUser ? (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedUser.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                    aria-label={t("common.remove")}
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t(
                        "goals.components.bulk.reassignModal.searchPlaceholder",
                      )}
                      className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    {isSearching && (
                      <Loader2 className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className="w-full px-3 py-2 ltr:text-left rtl:text-right hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.email}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t("goals.components.bulk.reassignModal.resultSummary", {
                  success: result.success_count,
                  failed: result.failure_count,
                })}
              </p>
              {result.results
                .filter((r) => !r.success)
                .map((r) => (
                  <p
                    key={r.goal_id}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    {r.goal_id.slice(0, 8)}...: {r.error}
                  </p>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedUser || bulkAction.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {bulkAction.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserRoundPen className="w-4 h-4" />
                )}
                {t("goals.components.bulk.reassign")}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t("common.close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
