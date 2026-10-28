import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, FileX, X } from "lucide-react";
import type { RejectedAttachment } from "../../utils/imageValidation";

interface RejectedAttachmentsListProps {
  items: RejectedAttachment[];
  onDismiss: () => void;
  /** Heading above the list. Defaults to the unclear-photos message. */
  title?: string;
}

export const RejectedAttachmentsList: React.FC<
  RejectedAttachmentsListProps
> = ({ items, onDismiss, title }) => {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/70 dark:bg-red-500/10 text-sm overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {title ??
            t("incidents.invalidImagesRemoved", {
              count: items.length,
              defaultValue:
                "Some photos weren't added because they aren't clear enough. Please upload clearer photos.",
            })}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("common.dismiss", "Dismiss")}
          className="p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="border-t border-red-200 dark:border-red-500/30 divide-y divide-red-100 dark:divide-red-500/20">
        {items.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className="flex items-start gap-2.5 px-3 py-2"
          >
            <FileX className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <div className="min-w-0">
              <p className="font-medium text-[hsl(var(--foreground))] truncate">
                {item.name}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {item.reason}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface PolicyRejectedListProps {
  policy: { rejected: RejectedAttachment[]; clearRejected: () => void };
}

/** Files rejected by the attachment rules (type, size, count). */
export const PolicyRejectedList: React.FC<PolicyRejectedListProps> = ({
  policy,
}) => {
  const { t } = useTranslation();
  return (
    <RejectedAttachmentsList
      title={t("attachments.notAdded", {
        count: policy.rejected.length,
        defaultValue: "{{count}} file(s) couldn't be added",
      })}
      items={policy.rejected}
      onDismiss={policy.clearRejected}
    />
  );
};
