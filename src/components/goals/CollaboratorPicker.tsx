import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, UserPlus, X, ChevronDown } from "lucide-react";
import type { GoalCollaborator, CollaboratorRole } from "../../types/goal";
import { COLLABORATOR_ROLE_OPTIONS } from "../../types/goal";
import {
  useAddCollaborator,
  useRemoveCollaborator,
} from "../../hooks/useGoals";
import { userApi } from "../../api/admin";

interface UserSearchResult {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  avatar?: string;
}

interface CollaboratorPickerProps {
  goalId: string;
  existingCollaborators: GoalCollaborator[];
}

export const CollaboratorPicker: React.FC<CollaboratorPickerProps> = ({
  goalId,
  existingCollaborators,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRole, setSelectedRole] =
    useState<CollaboratorRole>("collaborator");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const addCollaborator = useAddCollaborator();
  const removeCollaborator = useRemoveCollaborator();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        const response = await userApi.list(1, 20, debouncedSearch);
        const users = response.data || [];
        // Filter out already-added collaborators
        const existingUserIds = new Set(
          existingCollaborators.map((c) => c.user_id),
        );
        const filtered = users.filter(
          (u: UserSearchResult) => !existingUserIds.has(u.id),
        );
        setSearchResults(filtered);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchUsers();
  }, [debouncedSearch, existingCollaborators]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddCollaborator = (user: UserSearchResult) => {
    addCollaborator.mutate(
      {
        goalId,
        data: {
          user_id: user.id,
          role: selectedRole,
        },
      },
      {
        onSuccess: () => {
          setSearchQuery("");
          setSearchResults([]);
          setShowDropdown(false);
        },
      },
    );
  };

  const handleRemoveCollaborator = (userId: string) => {
    removeCollaborator.mutate({ goalId, userId });
  };

  const getRoleLabel = (role: CollaboratorRole): string => {
    return t(`goals.components.collaboratorRole.${role}`, {
      defaultValue: role,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search + Role selector + Add */}
      <div className="flex items-end gap-3" ref={dropdownRef}>
        {/* Search input */}
        <div className="flex-1 relative">
          <label
            htmlFor="collaborator-search"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t("goals.components.collaborator.searchLabel")}
          </label>
          <div className="relative">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="collaborator-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("goals.components.collaborator.searchPlaceholder")}
              className="w-full ltr:pl-10 ltr:pr-3 rtl:pr-10 rtl:pl-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {isSearching && (
              <div className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-sm text-slate-500 dark:text-slate-400">
                  {debouncedSearch.length < 2
                    ? t("goals.components.collaborator.typeAtLeast")
                    : t("goals.components.collaborator.noUsersFound")}
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAddCollaborator(user)}
                    disabled={addCollaborator.isPending}
                    className="w-full flex items-center gap-3 px-4 py-2.5 ltr:text-left rtl:text-right hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/30 last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold flex-shrink-0">
                      {user.first_name?.[0]?.toUpperCase() ?? ""}
                      {user.last_name?.[0]?.toUpperCase() ?? ""}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <UserPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Role selector */}
        <div>
          <label
            htmlFor="collaborator-role"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t("goals.components.collaborator.roleLabel")}
          </label>
          <div className="relative">
            <select
              id="collaborator-role"
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value as CollaboratorRole)
              }
              className="appearance-none w-full px-3 py-2 ltr:pr-8 rtl:pl-8 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {COLLABORATOR_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`goals.components.collaboratorRole.${opt.value}`)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Existing collaborators list */}
      {existingCollaborators.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("goals.components.collaborator.headingWithCount", {
              count: existingCollaborators.length,
            })}
          </h4>
          <div className="space-y-1.5">
            {existingCollaborators.map((collaborator) => {
              const name = collaborator.user
                ? `${collaborator.user.first_name} ${collaborator.user.last_name}`.trim()
                : t("goals.components.collaborator.unknownUser");
              const email = collaborator.user?.email ?? "";
              const initials = collaborator.user
                ? `${collaborator.user.first_name?.[0] ?? ""}${collaborator.user.last_name?.[0] ?? ""}`.toUpperCase()
                : "?";

              return (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {getRoleLabel(collaborator.role)}
                    </span>
                    <button
                      onClick={() =>
                        handleRemoveCollaborator(collaborator.user_id)
                      }
                      disabled={removeCollaborator.isPending}
                      className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title={t("goals.components.collaborator.removeTitle")}
                      aria-label={t(
                        "goals.components.collaborator.removeTitle",
                      )}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorPicker;
