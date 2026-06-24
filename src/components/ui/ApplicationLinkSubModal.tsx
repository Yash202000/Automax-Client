import React, { useEffect } from "react";
import { X, ExternalLink, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as LucideIcons from "lucide-react";
import type { ApplicationLink } from "../../types";

interface Props {
  parent: ApplicationLink | null;
  onClose: () => void;
  onLinkClick: (_link: ApplicationLink) => void;
}

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/${url}`;
};

const getIconComponent = (iconName: string): React.ElementType => {
  const Icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return Icons[iconName] || ExternalLink;
};

const getGradientClasses = (color: string) => {
  const gradients: Record<string, string> = {
    blue: "from-blue-500 to-cyan-500",
    violet: "from-violet-500 to-purple-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
    orange: "from-orange-500 to-red-600",
  };
  return gradients[color] || "from-blue-500 to-cyan-500";
};

export const ApplicationLinkSubModal: React.FC<Props> = ({
  parent,
  onClose,
  onLinkClick,
}) => {
  const { t, i18n } = useTranslation();

  // Close on Escape
  useEffect(() => {
    if (!parent) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [parent, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (parent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [parent]);

  if (!parent) return null;

  const children = parent.children ?? [];
  const parentName =
    i18n.language === "ar" && parent.name_ar ? parent.name_ar : parent.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={parentName}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-2xl bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-[hsl(var(--border))]">
          <div
            className={`p-2.5 rounded-xl bg-linear-to-br ${getGradientClasses(parent.color)} shrink-0`}
          >
            {React.createElement(getIconComponent(parent.icon), {
              className: "w-6 h-6 text-white",
            })}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] truncate">
              {parentName}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t("applicationLinks.selectSubApp", "Select a sub-application")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0"
            aria-label={t("common.cancel")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-link grid */}
        <div className="p-6">
          {children.length === 0 ? (
            <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
              {t(
                "applicationLinks.noSubLinks",
                "No sub-links configured for this group.",
              )}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {children.map((child) => {
                const ChildIcon = getIconComponent(child.icon);
                const gradient = getGradientClasses(child.color);
                const childName =
                  i18n.language === "ar" && child.name_ar
                    ? child.name_ar
                    : child.name;
                const childDesc =
                  i18n.language === "ar" && child.description_ar
                    ? child.description_ar
                    : child.description;
                const hasImage = Boolean(child.image_url);

                return (
                  <button
                    key={child.id}
                    onClick={() => {
                      onLinkClick(child);
                      onClose();
                    }}
                    className={`
                      group relative overflow-hidden rounded-xl p-4
                      bg-linear-to-br ${gradient}
                      shadow-md hover:shadow-lg hover:scale-[1.02]
                      transition-all duration-300 ease-out
                      min-h-[100px] flex flex-col justify-between
                      text-left w-full cursor-pointer
                    `}
                  >
                    {/* Background decoration */}
                    <div className="absolute -top-3 -end-3 w-16 h-16 opacity-10">
                      {hasImage ? (
                        <img
                          src={resolveImageUrl(child.image_url)}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ChildIcon
                          className="w-full h-full"
                          strokeWidth={0.5}
                        />
                      )}
                    </div>

                    {/* External link corner badge */}
                    <div className="absolute top-2 right-2 p-1 bg-white/20 rounded-md">
                      <ExternalLink className="w-3 h-3 text-white" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg w-fit mb-2">
                        {hasImage ? (
                          <img
                            src={resolveImageUrl(child.image_url)}
                            alt={childName}
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <ChildIcon className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {childName}
                      </h3>
                      {childDesc && (
                        <p className="text-white/80 text-xs mt-0.5 line-clamp-1">
                          {childDesc}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="relative z-10 flex justify-end mt-2">
                      <div className="p-1 bg-white/10 rounded-md group-hover:bg-white/20 group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 transition-all">
                        <ArrowRight className="w-3.5 h-3.5 text-white rtl:-rotate-180" />
                      </div>
                    </div>

                    {/* Shine */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
