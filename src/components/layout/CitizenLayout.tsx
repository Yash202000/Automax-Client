import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { publicUrl } from "../../utils/publicUrl";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CitizenLayout: React.FC = () => {
  const { t } = useTranslation();

  const location = useLocation();
  const user = location.state?.auth_data?.user;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="h-[70px] bg-white dark:bg-sidebar border-b border-slate-200/80 dark:border-white/5 flex justify-between items-center px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center">
          <img
            src={publicUrl("epm-logo.png")}
            alt="Logo"
            className="h-10 w-auto"
          />
        </div>
        <button className="flex items-center gap-3 p-1.5 pr-3 bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-0 group cursor-pointer">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-9 h-9 rounded-xl object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-linear-to-r from-primary to-accent flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.first_name?.[0] || user?.username?.[0] || "U"}
              </span>
            </div>
          )}
          <div className="hidden sm:block text-start">
            <p className="text-sm font-semibold group-hover:text-black leading-tight">
              {user?.first_name || user?.username}
            </p>
            <p className="text-xs text-slate-400 leading-tight flex items-center gap-1">
              {user?.is_super_admin && (
                <Sparkles className="w-3 h-3 text-amber-500" />
              )}
              {user?.is_super_admin
                ? t("profile.superAdmin")
                : user?.roles?.[0]?.name || t("sidebar.user")}
            </p>
          </div>
        </button>
      </header>

      {/* Page Content */}
      <main className="flex-1 bg-background p-4 lg:p-8">
        <div className="max-w-3xl mx-auto px-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
