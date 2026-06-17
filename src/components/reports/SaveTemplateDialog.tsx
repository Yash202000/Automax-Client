import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Save, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui";
import type { ReportTemplate } from "../../types";

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    name_ar: string,
    description: string,
    description_ar: string,
    isPublic: boolean,
  ) => Promise<void>;
  isSaving: boolean;
  existingTemplate?: ReportTemplate | null;
  dataSourceLabel: string;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
  existingTemplate,
  dataSourceLabel,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [name_ar, setNameAr] = useState("");
  const [description_ar, setDescriptionAr] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (existingTemplate) {
        setName(existingTemplate.name);
        setDescription(existingTemplate.description || "");
        setNameAr(existingTemplate.name_ar || "");
        setDescriptionAr(existingTemplate.description_ar || "");
        setIsPublic(existingTemplate.is_public);
      } else {
        setName(`${dataSourceLabel} Report`);
        setDescription("");
        setNameAr("");
        setDescriptionAr("");
        setIsPublic(false);
      }
      setErrors({});
    }
  }, [isOpen, existingTemplate, dataSourceLabel]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = t("reports.saveDialog.templateNameRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await onSave(
      name.trim(),
      name_ar.trim(),
      description.trim(),
      description_ar.trim(),
      isPublic,
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-[hsl(var(--card))] rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Save className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {existingTemplate
                  ? t("reports.saveDialog.updateTemplate")
                  : t("reports.saveDialog.saveAsTemplate")}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {dataSourceLabel} {t("reports.saveDialog.report")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              {t("reports.saveDialog.templateName")} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              placeholder={t("reports.saveDialog.templateNamePlaceholder")}
              className={cn(
                "w-full px-4 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]",
                errors.name ? "border-red-500" : "border-[hsl(var(--border))]",
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              {t("reports.saveDialog.templateNameAr")}
            </label>
            <input
              type="text"
              dir="rtl"
              value={name_ar}
              onChange={(e) => {
                setNameAr(e.target.value);
              }}
              placeholder={t("reports.saveDialog.templateNamePlaceholderAr")}
              className={cn(
                "w-full px-4 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]",
                "border-[hsl(var(--border))]",
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              {t("reports.saveDialog.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("reports.saveDialog.descriptionPlaceholder")}
              rows={3}
              className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              {t("reports.saveDialog.descriptionAr")}
            </label>
            <textarea
              dir="rtl"
              value={description_ar}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder={t("reports.saveDialog.descriptionPlaceholderAr")}
              rows={3}
              className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              {t("reports.saveDialog.visibility")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  !isPublic
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                    : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]",
                )}
              >
                <Lock
                  className={cn(
                    "w-5 h-5",
                    !isPublic
                      ? "text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))]",
                  )}
                />
                <div className="ltr:text-left rtl:text-right">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {t("reports.saveDialog.private")}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("reports.saveDialog.privateDesc")}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  isPublic
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                    : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]",
                )}
              >
                <Globe
                  className={cn(
                    "w-5 h-5",
                    isPublic
                      ? "text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))]",
                  )}
                />
                <div className="ltr:text-left rtl:text-right">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {t("reports.saveDialog.public")}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("reports.saveDialog.publicDesc")}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t("reports.saveDialog.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={!isSaving ? <Save className="w-4 h-4" /> : undefined}
          >
            {isSaving
              ? t("reports.saveDialog.saving")
              : existingTemplate
                ? t("reports.saveDialog.updateTemplate")
                : t("reports.saveDialog.saveTemplate")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SaveTemplateDialog;
