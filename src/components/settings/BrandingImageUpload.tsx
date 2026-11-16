import { useEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent, KeyboardEvent } from "react";
import {
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  settingsApi,
  type BrandingImageConfig,
  type BrandingImageField,
} from "@/api/settings";
import { resolveLogoUrl } from "@/utils/publicUrl";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon,.ico";

/** Checkerboard so transparent logos remain visible. */
const CHECKERBOARD: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

interface BrandingImageUploadProps {
  /** Settings field this uploads to; the server saves it immediately. */
  field: BrandingImageField;
  /** Config the attachment is stored under (default "settings"). */
  config?: BrandingImageConfig;
  label: string;
  /** Plain settings field value (fallback when nothing is uploaded). */
  value: string;
  /** Uploaded image URL from settings_attachments[field]; shown over `value`. */
  attachment?: string | null;
  /** Called after a successful upload (e.g. to refetch settings). */
  onUploaded: () => void | Promise<unknown>;
  /** Clears the image locally; persisted with the next settings save. */
  onRemove: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  description?: string;
  /** Short recommendation shown under the drop zone, e.g. "SVG or PNG, 512×128". */
  hint?: string;
  /** Preview size: "wide" for full logos, "square" for icons/favicons. */
  variant?: "wide" | "square";
}

export function BrandingImageUpload({
  field,
  config,
  label,
  value,
  attachment,
  onUploaded,
  onRemove,
  onUploadingChange,
  description,
  hint,
  variant = "wide",
}: BrandingImageUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const resolvedValue = attachment || resolveLogoUrl(value);
  // Uploaded attachments live server-side and can only be replaced, not
  // cleared via the settings form.
  const canRemove = !attachment && !!value;
  const uploading = progress !== null;

  useEffect(() => {
    if (!preview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const selectFile = async (file?: File) => {
    if (!file || uploading) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        t(
          "settings.branding.invalidType",
          "Choose a JPG, PNG, GIF, WebP, SVG, or ICO image.",
        ),
      );
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(
        t("settings.branding.maxSize", "Image must be 5 MB or smaller."),
      );
      return;
    }

    setPreview(URL.createObjectURL(file));
    setProgress(0);
    onUploadingChange?.(true);
    try {
      await settingsApi.uploadBrandingImage(field, file, {
        replace: !!attachment,
        config,
        onUploadProgress: setProgress,
      });
      await onUploaded();
      toast.success(
        t("settings.branding.uploaded", "Image uploaded successfully."),
      );
    } catch (error) {
      const apiError = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(
        apiError || t("settings.branding.uploadFailed", "Image upload failed."),
      );
    } finally {
      setPreview(null);
      setProgress(null);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (uploading || !event.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    void selectFile(event.dataTransfer.files?.[0]);
  };

  const shownImage = preview ?? resolvedValue;
  const previewSize = variant === "square" ? "h-16 w-16" : "h-16 max-w-[85%]";

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
          {label}
        </p>
        {resolvedValue && !uploading && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600">
            {t("settings.branding.set", "Set")}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => void selectFile(event.target.files?.[0])}
      />

      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-label={
          shownImage
            ? t("settings.branding.replaceAria", "Replace {{label}}", { label })
            : t("settings.branding.uploadAria", "Upload {{label}}", { label })
        }
        aria-busy={uploading}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "group relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isDragging
            ? "scale-[1.01] border-primary bg-primary/5"
            : shownImage
              ? "border-[hsl(var(--border))] hover:border-primary/60"
              : "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 hover:border-primary/60 hover:bg-primary/5",
          uploading ? "cursor-wait" : "",
        ].join(" ")}
      >
        {shownImage ? (
          <>
            <div className="absolute inset-0 opacity-60" style={CHECKERBOARD} />
            <img
              src={shownImage}
              alt={`${label} preview`}
              className={`relative ${previewSize} object-contain drop-shadow-sm transition-opacity ${uploading ? "opacity-50" : ""}`}
            />
            {!uploading && !isDragging && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openPicker();
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-900 shadow hover:bg-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("settings.branding.replace", "Replace")}
                </button>
                {canRemove && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove();
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/95 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.remove", "Remove")}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isDragging ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary/15"}`}
            >
              {isDragging ? (
                <UploadCloud className="h-5 w-5" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {isDragging ? (
                <span className="font-medium text-primary">
                  {t("settings.branding.dropHere", "Drop image here")}
                </span>
              ) : (
                <>
                  <span className="font-medium text-primary">
                    {t("settings.branding.clickToUpload", "Click to upload")}
                  </span>{" "}
                  {t("settings.branding.orDrag", "or drag and drop")}
                </>
              )}
            </p>
          </div>
        )}

        {isDragging && shownImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-primary/10 text-primary backdrop-blur-[2px]">
            <UploadCloud className="h-6 w-6" />
            <span className="text-xs font-medium">
              {t("settings.branding.dropToReplace", "Drop to replace")}
            </span>
          </div>
        )}

        {uploading && (
          <div
            className="absolute inset-x-0 bottom-0 bg-[hsl(var(--card))]/90 px-3 py-2 backdrop-blur"
            aria-live="polite"
          >
            <div className="mb-1 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("settings.branding.uploading", "Uploading...")}
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-[hsl(var(--muted-foreground))]">
        {description && <span className="block">{description}</span>}
        {hint ??
          t(
            "settings.branding.formats",
            "PNG, SVG, WebP, JPG or ICO · max 5 MB",
          )}
      </p>
    </div>
  );
}
