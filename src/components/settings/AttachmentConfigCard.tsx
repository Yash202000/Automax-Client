import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Archive,
  Building2,
  Check,
  FileSpreadsheet,
  FileText,
  Image,
  Music,
  Paperclip,
  Presentation,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";
import type {
  AttachmentAudience,
  AttachmentAudienceConfig,
  AttachmentConfigValue,
  AttachmentFileType,
} from "@/api/attachmentConfig";
import {
  BLOCKED_EXTENSIONS,
  getActiveExtensions,
} from "@/utils/attachmentPolicy";

interface AttachmentConfigCardProps {
  value: AttachmentConfigValue;
  onChange: (value: AttachmentConfigValue) => void;
}

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  image: { label: "Images", icon: Image },
  document: { label: "Documents", icon: FileText },
  spreadsheet: { label: "Spreadsheets", icon: FileSpreadsheet },
  presentation: { label: "Presentations", icon: Presentation },
  audio: { label: "Audio", icon: Music },
  video: { label: "Video", icon: Video },
  archive: { label: "Archives", icon: Archive },
};

const getTypeMeta = (type: string) =>
  TYPE_META[type] ?? {
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: Paperclip,
  };

const countExtensions = (config: AttachmentAudienceConfig) =>
  config.file_types.reduce((sum, type) => sum + type.extensions.length, 0);

// A file type counts as enabled while at least one of its extensions is active.
const withExtensions = (
  type: AttachmentFileType,
  isActive: (name: string, wasActive: boolean) => boolean,
): AttachmentFileType => {
  const extensions = type.extensions.map((ext) => ({
    ...ext,
    active: isActive(ext.name, ext.active),
  }));
  return { ...type, extensions, enabled: extensions.some((e) => e.active) };
};

const badgeOn =
  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30";
const badgeOff =
  "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]";
const inputClass =
  "w-full px-4 py-3 rounded-lg border border-transparent bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none";

export const AttachmentConfigCard: React.FC<AttachmentConfigCardProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const [audience, setAudience] = useState<AttachmentAudience>("citizen");

  const current = value[audience];
  const selectedCount = getActiveExtensions(current).length;
  const total = countExtensions(current);
  const selectionMode =
    selectedCount === total ? "all" : selectedCount === 0 ? "none" : "specific";

  const update = (patch: Partial<AttachmentAudienceConfig>) =>
    onChange({ ...value, [audience]: { ...current, ...patch } });

  const setAllExtensions = (active: boolean) =>
    update({
      file_types: current.file_types.map((type) =>
        withExtensions(type, () => active),
      ),
    });

  const toggleExtension = (typeName: string, extName: string) =>
    update({
      file_types: current.file_types.map((type) =>
        type.type === typeName
          ? withExtensions(type, (name, wasActive) =>
              name === extName ? !wasActive : wasActive,
            )
          : type,
      ),
    });

  const audienceTabs: {
    key: AttachmentAudience;
    icon: LucideIcon;
    label: string;
  }[] = [
    {
      key: "citizen",
      icon: User,
      label: t("settings.attachments.citizens", "Citizens (Chatbot & Portal)"),
    },
    {
      key: "internal",
      icon: Building2,
      label: t(
        "settings.attachments.internalUsers",
        "Internal Users (Agents & Admins)",
      ),
    },
  ];

  const audienceShortLabel =
    audience === "citizen"
      ? t("settings.attachments.forCitizens", "Citizens")
      : t("settings.attachments.forInternalUsers", "Internal Users");

  const selectionButtons = [
    {
      mode: "all",
      label: t("settings.attachments.selectAll", "Select All"),
      onClick: () => setAllExtensions(true),
    },
    {
      mode: "none",
      label: t("settings.attachments.selectNone", "Select None"),
      onClick: () => setAllExtensions(false),
    },
    {
      // Highlighted automatically when only some extensions are picked.
      mode: "specific",
      label: t("settings.attachments.selectSpecific", "Select Specific"),
      onClick: undefined,
    },
  ];

  return (
    <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 shrink-0">
            <Paperclip className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                {t(
                  "settings.attachments.title",
                  "Attachment & File Types Configuration",
                )}
              </h2>
              <span
                className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${badgeOn}`}
              >
                {t("settings.attachments.activePolicies", "Active Policies")}
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {t(
                "settings.attachments.description",
                "Configure global limits, allowed file categories, and extensions separately for Citizens and Internal Users.",
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 shrink-0">
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {t(
                "settings.attachments.enableAttachments",
                "Enable Attachments",
              )}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {current.enabled
                ? t("settings.attachments.enabledFor", {
                    audience: audienceShortLabel,
                    defaultValue: "Enabled for {{audience}}",
                  })
                : t("settings.attachments.disabledFor", {
                    audience: audienceShortLabel,
                    defaultValue: "Disabled for {{audience}}",
                  })}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={current.enabled}
            onClick={() => update({ enabled: !current.enabled })}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              current.enabled
                ? "bg-emerald-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                current.enabled
                  ? "translate-x-6 rtl:-translate-x-6"
                  : "translate-x-1 rtl:-translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Audience tabs */}
      <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] mb-4">
        {audienceTabs.map(({ key, icon: Icon, label }) => {
          const active = audience === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setAudience(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))] font-medium"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-emerald-600" : ""}`} />
              {label}
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  active ? badgeOn : badgeOff
                }`}
              >
                {t("settings.attachments.countOf", {
                  count: getActiveExtensions(value[key]).length,
                  total: countExtensions(value[key]),
                  defaultValue: "{{count}} of {{total}}",
                })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Security policy */}
      <div
        className="flex items-start gap-2 px-4 py-2.5 mb-6 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-400"
        title={BLOCKED_EXTENSIONS.map((e) => `.${e}`).join(", ")}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          <span className="font-semibold">
            {t("settings.attachments.securityPolicy", "Security Policy:")}
          </span>{" "}
          {t("settings.attachments.securityPolicyDesc", {
            count: BLOCKED_EXTENSIONS.length,
            defaultValue:
              "{{count}} dangerous executable file types (.exe, .bat, .sh, .cmd, .msi, etc.) are permanently blocked.",
          })}
        </p>
      </div>

      <div
        className={`border-t border-[hsl(var(--border))] pt-6 space-y-6 transition-opacity ${
          current.enabled ? "" : "opacity-50 pointer-events-none"
        }`}
        aria-disabled={!current.enabled}
      >
        {/* Limits + selection mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              {t("settings.attachments.maxFileSize", "Max File Size (MB)")}
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={current.max_file_size_mb}
                onChange={(e) =>
                  update({ max_file_size_mb: Number(e.target.value) })
                }
                className={`${inputClass} pe-12`}
              />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))] pointer-events-none">
                MB
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              {t(
                "settings.attachments.maxFilesPerUpload",
                "Max Files per Upload",
              )}
            </label>
            <input
              type="number"
              min={1}
              value={current.max_files_per_upload}
              onChange={(e) =>
                update({ max_files_per_upload: Number(e.target.value) })
              }
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[hsl(var(--muted-foreground))] mb-2">
                {t("settings.attachments.selectionMode", "Selection Mode")}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectionButtons.map(({ mode, label, onClick }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={onClick}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectionMode === mode
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-end">
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                {t("settings.attachments.totalSelected", "Total Selected")}
              </p>
              <span
                className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${badgeOn}`}
              >
                {t("settings.attachments.countSelected", {
                  count: selectedCount,
                  total,
                  defaultValue: "{{count}} of {{total}} selected",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* File types */}
        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 space-y-3">
          {current.file_types.map((fileType) => {
            const { label, icon: Icon } = getTypeMeta(fileType.type);
            const activeCount = fileType.extensions.filter(
              (e) => e.active,
            ).length;
            const hasAny = activeCount > 0;
            return (
              <div
                key={fileType.type}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
              >
                <div className="flex items-center gap-3 sm:w-52 shrink-0">
                  <div
                    className={`p-1.5 rounded-lg ${
                      hasAny
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {t(
                      `settings.attachments.categories.${fileType.type}`,
                      label,
                    )}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                      hasAny ? badgeOn : badgeOff
                    }`}
                  >
                    {activeCount} / {fileType.extensions.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {fileType.extensions.map((ext) => (
                    <button
                      key={ext.name}
                      type="button"
                      aria-pressed={ext.active}
                      onClick={() => toggleExtension(fileType.type, ext.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        ext.active
                          ? `${badgeOn} font-medium`
                          : "bg-[hsl(var(--background))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-emerald-300 hover:text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {ext.active && <Check className="w-3.5 h-3.5" />}
                      {`.${ext.name}`}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
