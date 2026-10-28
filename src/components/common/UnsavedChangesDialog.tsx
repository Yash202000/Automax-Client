import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onLeave: () => void;
  onStay: () => void;
  /** Saves the changes; resolves to true on success. */
  onSave: () => Promise<boolean>;
  isSaving?: boolean;
}

/** Save / Discard / Stay prompt shown when navigating away with unsaved changes. */
export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onLeave,
  onStay,
  onSave,
  isSaving = false,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const handleSave = async () => {
    if (await onSave()) onLeave();
  };

  return (
    <Modal isOpen onClose={onStay} size="md">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-500/15 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {t("common.unsavedChangesTitle", "You have unsaved changes")}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {t(
                "common.unsavedChangesDesc",
                "Save your changes before leaving, or discard them.",
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onStay}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
          >
            {t("common.stay", "Stay on page")}
          </button>
          <button
            type="button"
            onClick={onLeave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
          >
            {t("common.discard", "Discard")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t("common.saveAndLeave", "Save & leave")}
          </button>
        </div>
      </div>
    </Modal>
  );
};
