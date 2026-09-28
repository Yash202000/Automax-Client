import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";
import type { RejectedAttachment } from "../../utils/imageValidation";

interface RejectedAttachmentsListProps {
  items: RejectedAttachment[];
  onDismiss: () => void;
}

export const RejectedAttachmentsList: React.FC<
  RejectedAttachmentsListProps
> = ({ items, onDismiss }) => {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t("incidents.invalidImagesRemoved", {
            count: items.length,
            defaultValue:
              "Some photos weren't added because they aren't clear enough. Please upload clearer photos.",
          })}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 text-red-400 hover:text-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="mt-2 space-y-1 ps-6 list-disc text-red-600">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="wrap-break-word">
            <span className="font-medium">{item.name}</span>: {item.reason}
          </li>
        ))}
      </ul>
    </div>
  );
};
