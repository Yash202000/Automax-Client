import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileExtension } from "@/utils/attachmentPolicy";
import type { RejectedAttachment } from "@/utils/imageValidation";
import { useAttachmentPolicy } from "@/hooks/useAttachmentPolicy";
import { useImageValidation } from "@/hooks/useImageValidation";
import type { AttachmentAudience } from "@/api/attachmentConfig";

interface DropzonePolicy {
  accept?: string;
  allowedHint: string;
  limitsHint: string;
}

interface AttachmentDropzoneProps {
  policy: DropzonePolicy;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  /** Replaces the "Drag files here" text, e.g. "Uploading..." */
  busyText?: string;
  hasError?: boolean;
}

/** Drag-and-drop / browse area with the allowed types and limits. */
export const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
  policy,
  onFiles,
  multiple = true,
  disabled = false,
  busyText,
  hasError = false,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-8 text-center rounded-xl border-2 border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]",
        hasError
          ? "border-[hsl(var(--destructive)/0.5)]"
          : isDragging
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]"
            : "border-[hsl(var(--border))]",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted)/0.3)]",
      )}
    >
      {busyText ? (
        <Loader2 className="w-7 h-7 text-[hsl(var(--primary))] animate-spin" />
      ) : (
        <Upload className="w-7 h-7 text-[hsl(var(--primary))]" />
      )}
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
        {busyText ?? (
          <>
            {t("attachments.dragFilesHere", "Drag files here or")}{" "}
            <span className="text-[hsl(var(--primary))]">
              {t("attachments.browse", "browse")}
            </span>
          </>
        )}
      </p>
      {policy.allowedHint && (
        <p className="text-xs text-[hsl(var(--foreground)/0.8)] max-w-3xl">
          {policy.allowedHint}
        </p>
      )}
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {policy.limitsHint}
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        accept={policy.accept}
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

interface AttachmentFileRowProps {
  name: string;
  /** File size in bytes; omitted for rejected files. */
  size?: number;
  status: "ready" | "uploading" | "uploaded" | "rejected";
  /** Rejection reason (status "rejected"). */
  message?: string;
  /** Remove / dismiss handler; shows an X button. */
  onRemove?: () => void;
  onNameClick?: () => void;
}

/** One file in the upload list: ready, uploading, uploaded or rejected. */
export const AttachmentFileRow: React.FC<AttachmentFileRowProps> = ({
  name,
  size,
  status,
  message,
  onRemove,
  onNameClick,
}) => {
  const { t } = useTranslation();
  const isRejected = status === "rejected";
  const ext = getFileExtension(name).toUpperCase().slice(0, 4) || "FILE";

  const statusLabel = {
    ready: t("attachments.ready", "Ready to upload"),
    uploading: t("attachments.uploading", "Uploading..."),
    uploaded: t("attachments.uploaded", "Uploaded"),
    rejected: "",
  }[status];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border",
        isRejected
          ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))]",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold",
          isRejected
            ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
            : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
        )}
      >
        {ext}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium text-[hsl(var(--foreground))] truncate",
            onNameClick && "cursor-pointer hover:underline",
          )}
          onClick={onNameClick}
        >
          {name}
        </p>
        <p
          className={cn(
            "text-xs",
            isRejected
              ? "text-red-600 dark:text-red-400"
              : "text-[hsl(var(--muted-foreground))]",
          )}
        >
          {isRejected
            ? message
            : [size !== undefined && formatSize(size), statusLabel]
                .filter(Boolean)
                .join(" · ")}
        </p>
      </div>
      {status === "uploaded" && (
        <Check className="w-5 h-5 shrink-0 text-emerald-500" />
      )}
      {status === "uploading" && (
        <Loader2 className="w-5 h-5 shrink-0 animate-spin text-[hsl(var(--primary))]" />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={
            isRejected
              ? t("common.dismiss", "Dismiss")
              : t("common.remove", "Remove")
          }
          className={cn(
            "p-1 shrink-0 rounded transition-colors",
            isRejected
              ? "text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
              : "text-[hsl(var(--muted-foreground))] hover:text-red-500",
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

interface RejectedFileRowsProps {
  items: RejectedAttachment[];
  onDismiss: (index: number) => void;
}

/** Rejected files as rows, each with its reason and a dismiss button. */
export const RejectedFileRows: React.FC<RejectedFileRowsProps> = ({
  items,
  onDismiss,
}) => (
  <>
    {items.map((item, index) => (
      <AttachmentFileRow
        key={`${item.name}-${index}`}
        name={item.name}
        status="rejected"
        message={item.reason}
        onRemove={() => onDismiss(index)}
      />
    ))}
  </>
);

interface UploadItem {
  file: File;
  status: "uploading" | "uploaded" | "rejected";
  message?: string;
}

interface AttachmentUploadPanelProps {
  audience: AttachmentAudience;
  /** Uploads one file; called for each file that passes the checks. */
  uploadFile: (file: File) => Promise<unknown>;
  onUploaded?: () => void;
}

/**
 * Dropzone that uploads straight away (e.g. an incident's Attachments tab).
 * Checks files against the attachment rules and photo quality, then lists
 * this session's uploads and rejected files.
 */
export const AttachmentUploadPanel: React.FC<AttachmentUploadPanelProps> = ({
  audience,
  uploadFile,
  onUploaded,
}) => {
  const { t } = useTranslation();
  const policy = useAttachmentPolicy(audience);
  const imageValidation = useImageValidation();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const isUploading = uploads.some((u) => u.status === "uploading");

  const setStatus = (file: File, patch: Omit<UploadItem, "file">) =>
    setUploads((prev) =>
      prev.map((u) => (u.file === file ? { file, ...patch } : u)),
    );

  const handleFiles = async (files: File[]) => {
    const accepted = await policy.filterFiles(files);
    const { valid } = await imageValidation.validate(accepted);
    setUploads((prev) => [
      ...prev,
      ...valid.map((file) => ({ file, status: "uploading" as const })),
    ]);
    for (const file of valid) {
      try {
        await uploadFile(file);
        setStatus(file, { status: "uploaded" });
      } catch {
        setStatus(file, {
          status: "rejected",
          message: t(
            "attachments.uploadFailed",
            "Upload failed. Please try again.",
          ),
        });
      }
    }
    if (valid.length > 0) onUploaded?.();
  };

  return (
    <div className="space-y-3">
      <AttachmentDropzone
        policy={policy}
        onFiles={(files) => void handleFiles(files)}
        disabled={
          !policy.enabled || imageValidation.isValidating || isUploading
        }
        busyText={
          imageValidation.isValidating
            ? t("incidents.validatingImages", "Checking photos...")
            : isUploading
              ? t("attachments.uploading", "Uploading...")
              : undefined
        }
      />
      {uploads.map((upload, index) => (
        <AttachmentFileRow
          key={`${upload.file.name}-${index}`}
          name={upload.file.name}
          size={upload.file.size}
          status={upload.status}
          message={upload.message}
          onRemove={
            upload.status === "rejected"
              ? () => setUploads((prev) => prev.filter((u) => u !== upload))
              : undefined
          }
        />
      ))}
      <RejectedFileRows
        items={policy.rejected}
        onDismiss={policy.dismissRejected}
      />
      <RejectedFileRows
        items={imageValidation.rejected}
        onDismiss={imageValidation.dismissRejected}
      />
    </div>
  );
};
