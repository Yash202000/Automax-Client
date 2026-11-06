import { Suspense, lazy, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Music,
  Pen,
  Play,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { cn, getLocalizedName } from "@/lib/utils";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
// Lazy-loaded: the editor only downloads when its modal opens.
const ImageEditor = lazy(() => import("@/components/common/ImageEditor"));
import { useAuthStore } from "../../../../stores/authStore";
import { useFullscreen } from "../../../../hooks/useFullscreen";
import { AttachmentUploadPanel } from "../../../../components/attachments/AttachmentUpload";
import { incidentApi } from "../../../../api/admin";
import type { IncidentAttachment, TransitionHistory } from "../../../../types";
import {
  formatActivityDateTime,
  getAttachmentPreviewUrl,
  getAttachmentUrl,
} from "./workspaceUtils";

/* Attachments tab — same list/upload/delete/edit/compare flows as
   IncidentDetailPage: upload + compare header, image cards with hover
   actions and uploader / transition info, audio + video players,
   compare slider modal, image editor. */

function AttachmentCardFooter({
  attachment,
  transitionHistory,
}: {
  attachment: IncidentAttachment;
  transitionHistory: TransitionHistory[];
}) {
  const { t } = useTranslation();
  const entry = transitionHistory.find(
    (h) => h.id === attachment.transition_history_id,
  );
  const uploaderName =
    [attachment.uploaded_by?.first_name, attachment.uploaded_by?.last_name]
      .filter(Boolean)
      .join(" ") ||
    attachment.uploaded_by?.username ||
    "—";
  const roleName =
    getLocalizedName(attachment.uploaded_by?.roles?.[0]) ||
    t("incidents.noRole");
  const departmentName =
    (attachment.uploaded_by?.departments || [])
      .map((d) => getLocalizedName(d))
      .filter(Boolean)
      .join(", ") || t("incidents.noDepartment");
  return (
    <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-[hsl(var(--card))] via-[hsl(var(--card)/0.97)] to-[hsl(var(--card)/0.85)] pt-3 pb-2 px-3 border-t border-[hsl(var(--border))] backdrop-blur-md pointer-events-none leading-tight">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-xs text-[hsl(var(--card-foreground))] truncate">
          {attachment.file_name}
        </span>
        <span className="text-[10px] text-[hsl(var(--card-foreground)/0.72)] font-mono shrink-0">
          {formatActivityDateTime(attachment.created_at)}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 min-w-0 text-[11px] text-[hsl(var(--card-foreground)/0.72)]">
        <div
          className="flex items-center gap-1.5 min-w-0"
          title={`${uploaderName} • ${roleName}`}
        >
          <span className="text-primary font-medium truncate">
            {uploaderName}
          </span>
          <span className="text-[hsl(var(--card-foreground)/0.5)] shrink-0">
            •
          </span>
          <span className="truncate">{roleName}</span>
        </div>
        {entry?.from_state && entry?.to_state ? (
          <span
            className="max-w-[45%] shrink-0 truncate"
            title={departmentName}
          >
            {departmentName}
          </span>
        ) : null}
      </div>
      {entry?.from_state && entry?.to_state ? (
        <div className="mt-1 flex min-h-5 items-center gap-1.5 min-w-0 pt-1 border-t border-[hsl(var(--border))] text-[11px] font-medium">
          <span className="text-[hsl(var(--card-foreground)/0.8)] truncate">
            {getLocalizedName(entry.from_state)}
          </span>
          <ChevronRight className="h-3 w-3 text-primary shrink-0 rtl:rotate-180" />
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">
            {getLocalizedName(entry.to_state)}
          </span>
        </div>
      ) : (
        <div className="mt-1 flex min-h-5 items-center min-w-0 pt-1 text-[11px] text-[hsl(var(--card-foreground)/0.72)]">
          <span className="truncate" title={departmentName}>
            {departmentName}
          </span>
        </div>
      )}
    </div>
  );
}

function MediaHoverActions({
  attachment,
  onDelete,
  onPreview,
  onEdit,
  deleting,
}: {
  attachment: IncidentAttachment;
  onDelete: () => void;
  onPreview?: () => void;
  onEdit?: () => void;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  const actionButtonClass =
    "w-7 h-7 rounded-full border flex items-center justify-center transition-colors shadow-sm cursor-pointer";
  return (
    <div className="absolute top-2 end-2 hidden group-hover:flex items-center gap-1 bg-[hsl(var(--popover)/0.95)] backdrop-blur-md p-1 rounded-full border border-[hsl(var(--border))] shadow-xl z-10">
      {onPreview ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className={cn(
            actionButtonClass,
            "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.85)] border-[hsl(var(--border))] text-[hsl(var(--foreground))]",
          )}
          title={t("incidents.preview", "Preview")}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <a
        href={getAttachmentUrl(attachment.id)}
        download={attachment.file_name}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          actionButtonClass,
          "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.85)] border-[hsl(var(--border))] text-[hsl(var(--foreground))]",
        )}
        title={t("common.download")}
      >
        <Download className="h-3.5 w-3.5" />
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={deleting}
        className={cn(
          actionButtonClass,
          "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-700 dark:text-rose-300 disabled:opacity-50",
        )}
        title={t("common.delete", "Delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {onEdit ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={cn(
            actionButtonClass,
            "bg-primary hover:bg-primary/90 border-primary/50 text-primary-foreground",
          )}
          title={t("common.edit", "Edit")}
        >
          <Pen className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function VideoPreview({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div
      className="relative w-full h-full cursor-pointer bg-black"
      onClick={() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
          void video.play();
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        onEnded={() => setPlaying(false)}
        className="w-full h-full object-cover"
      />
      {!playing ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
            <Play className="h-5 w-5 text-white ms-0.5" />
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function AttachmentsTab({
  incidentId,
  attachments,
  transitionHistory,
  onPreview,
}: {
  incidentId: string;
  attachments: IncidentAttachment[];
  transitionHistory: TransitionHistory[];
  onPreview: (attachmentId: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<
    IncidentAttachment[]
  >([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const {
    containerRef: compareContainerRef,
    isFullscreen: compareIsFullscreen,
    toggleFullscreen: toggleCompareFullscreen,
  } = useFullscreen<HTMLDivElement>();
  const [editorAttachment, setEditorAttachment] =
    useState<IncidentAttachment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IncidentAttachment | null>(
    null,
  );

  const refreshAttachments = () => {
    void queryClient.invalidateQueries({
      queryKey: ["incidents", "v2-list", "attachments", incidentId],
    });
    void queryClient.invalidateQueries({ queryKey: ["incidents", "v2-list"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      incidentApi.deleteAttachment(incidentId, attachmentId),
    onSuccess: () => {
      refreshAttachments();
      setPendingDelete(null);
      toast.success(t("incidents.attachmentDeleted"));
    },
    onError: () => {
      toast.error(t("incidents.attachmentDeleteFailed"));
    },
  });

  const confirmDeleteAttachment = () => {
    if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
  };

  const dataUrlToFile = async (editedImage: string): Promise<File> => {
    const response = await fetch(editedImage);
    const blob = await response.blob();
    return new File([blob], `edited_${Date.now()}.png`, {
      type: "image/png",
    });
  };

  const replaceImage = async (editedImage: string) => {
    if (!editorAttachment) return;
    try {
      const file = await dataUrlToFile(editedImage);
      // Upload the replacement first — the original is deleted only after
      // the upload succeeds, so a failed upload never loses the file.
      await incidentApi.uploadAttachment(incidentId, file);
      await incidentApi.deleteAttachment(incidentId, editorAttachment.id);
      refreshAttachments();
      toast.success(t("incidents.attachmentUploaded"));
      setEditorAttachment(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save edited image:", error);
      toast.error(t("incidents.saveFailed"));
      setEditorAttachment(null);
    }
  };

  const saveAsCopy = async (editedImage: string) => {
    try {
      const file = await dataUrlToFile(editedImage);
      await incidentApi.uploadAttachment(incidentId, file);
      refreshAttachments();
      toast.success(t("incidents.attachmentUploaded"));
      setEditorAttachment(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save edited image:", error);
      toast.error(t("incidents.saveFailed"));
      setEditorAttachment(null);
    }
  };

  const toggleCompareSelection = (attachment: IncidentAttachment) => {
    setSelectedForCompare((prev) => {
      if (prev.some((a) => a.id === attachment.id))
        return prev.filter((a) => a.id !== attachment.id);
      if (prev.length < 2) return [...prev, attachment];
      return prev;
    });
  };
  const isSelectedForCompare = (attachmentId: string) =>
    selectedForCompare.some((a) => a.id === attachmentId);

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare([]);
    setCompareModalOpen(false);
  };

  const images = attachments.filter((a) => a.mime_type.startsWith("image/"));
  const audios = attachments.filter((a) => a.mime_type.startsWith("audio/"));
  const videos = attachments.filter((a) => a.mime_type.startsWith("video/"));
  const files = attachments.filter(
    (a) =>
      !a.mime_type.startsWith("image/") &&
      !a.mime_type.startsWith("audio/") &&
      !a.mime_type.startsWith("video/"),
  );

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
      <div className="space-y-4">
        <AttachmentUploadPanel
          audience="internal"
          uploadFile={(file) => incidentApi.uploadAttachment(incidentId, file)}
          onUploaded={refreshAttachments}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {images.length >= 2 ? (
              <button
                type="button"
                onClick={() =>
                  compareMode ? exitCompareMode() : setCompareMode(true)
                }
                className="px-3.5 py-2 bg-[hsl(var(--muted)/0.9)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                {compareMode
                  ? t("incidents.exitCompare")
                  : t("incidents.compareImages")}
              </button>
            ) : null}
            {compareMode ? (
              <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                {t("incidents.selectImagesToCompare")} (
                {selectedForCompare.length}/2)
              </span>
            ) : null}
            {compareMode && selectedForCompare.length === 2 ? (
              <button
                type="button"
                onClick={() => {
                  setSliderPos(50);
                  setCompareModalOpen(true);
                }}
                className="px-3.5 py-2 bg-linear-to-r rtl:bg-linear-to-l from-primary to-accent text-primary-foreground rounded-lg text-xs font-semibold transition-all shadow-lg shadow-primary/0.25 hover:shadow-xl hover:shadow-[hsl(var(--primary)/0.3)]"
              >
                {t("incidents.compareNow")}
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
              {t("incidents.showingFiles", { count: attachments.length })}
            </span>
          </div>
        </div>
        {attachments.length === 0 ? (
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] py-8">
            {t("incidents.noAttachmentsYet")}
          </p>
        ) : (
          <>
            {images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map((attachment) => {
                  const selected = isSelectedForCompare(attachment.id);
                  return (
                    <div
                      key={attachment.id}
                      className={cn(
                        "relative rounded-xl overflow-hidden border bg-[hsl(var(--card))] shadow-lg group",
                        compareMode && selected
                          ? "border-primary/60 ring-1 ring-primary/40"
                          : "border-[hsl(var(--border))]",
                      )}
                    >
                      <div
                        className="w-full h-56 bg-[hsl(var(--muted)/0.9)] relative cursor-pointer"
                        onClick={() =>
                          compareMode
                            ? toggleCompareSelection(attachment)
                            : onPreview(attachment.id)
                        }
                      >
                        <img
                          src={getAttachmentPreviewUrl(attachment.id)}
                          alt={attachment.file_name}
                          className="w-full h-full object-cover"
                        />
                        {compareMode ? (
                          <div className="absolute top-2 start-2 z-10">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                selected
                                  ? "bg-primary border-primary"
                                  : "bg-[hsl(var(--muted)/0.9)] border-[hsl(var(--border))] hover:border-primary",
                              )}
                            >
                              {selected ? (
                                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                              ) : (
                                selectedForCompare.length < 2 && (
                                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                                    {selectedForCompare.length + 1}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        ) : (
                          <MediaHoverActions
                            attachment={attachment}
                            onDelete={() => setPendingDelete(attachment)}
                            onPreview={() => onPreview(attachment.id)}
                            onEdit={() => setEditorAttachment(attachment)}
                            deleting={deleteMutation.isPending}
                          />
                        )}
                      </div>
                      <AttachmentCardFooter
                        attachment={attachment}
                        transitionHistory={transitionHistory}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
            {files.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {files.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative rounded-xl overflow-hidden border bg-[hsl(var(--card))] shadow-lg group border-[hsl(var(--border))]"
                  >
                    <div className="w-full h-56 bg-[hsl(var(--muted)/0.9)] relative flex items-center justify-center">
                      <FileText className="h-12 w-12 text-[hsl(var(--muted-foreground))]" />
                      <MediaHoverActions
                        attachment={attachment}
                        onDelete={() => setPendingDelete(attachment)}
                        deleting={deleteMutation.isPending}
                      />
                    </div>
                    <AttachmentCardFooter
                      attachment={attachment}
                      transitionHistory={transitionHistory}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {audios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {audios.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative rounded-xl overflow-hidden border bg-[hsl(var(--card))] shadow-lg group border-[hsl(var(--border))]"
                  >
                    <div className="w-full h-56 bg-[hsl(var(--muted)/0.9)] relative flex flex-col items-center justify-center gap-3 p-4 pb-28">
                      <Music className="h-10 w-10 text-primary" />
                      <audio
                        controls
                        className="w-full"
                        src={getAttachmentPreviewUrl(attachment.id)}
                        preload="metadata"
                      >
                        {t("incidents.yourBrowserDoesNotSupportTheAudio")}
                      </audio>
                      <MediaHoverActions
                        attachment={attachment}
                        onDelete={() => setPendingDelete(attachment)}
                        deleting={deleteMutation.isPending}
                      />
                    </div>
                    <AttachmentCardFooter
                      attachment={attachment}
                      transitionHistory={transitionHistory}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative rounded-xl overflow-hidden border bg-[hsl(var(--card))] shadow-lg group border-[hsl(var(--border))]"
                  >
                    <div className="w-full h-56 bg-black relative">
                      <VideoPreview
                        src={getAttachmentPreviewUrl(attachment.id)}
                      />
                      <MediaHoverActions
                        attachment={attachment}
                        onDelete={() => setPendingDelete(attachment)}
                        deleting={deleteMutation.isPending}
                      />
                    </div>
                    <AttachmentCardFooter
                      attachment={attachment}
                      transitionHistory={transitionHistory}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Compare slider modal — same interaction as IncidentDetailPage. */}
      {compareModalOpen && selectedForCompare.length === 2 ? (
        <div
          ref={compareContainerRef}
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={() => setCompareModalOpen(false)}
        >
          <div
            className="flex items-center justify-between p-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">
                {t("incidents.imageComparison")}
              </h3>
              <span className="text-sm text-gray-400">
                {t("incidents.dragSliderToCompare")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCompareFullscreen();
                }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label={t("common.fullScreen", "Full Screen")}
              >
                {compareIsFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label={t("common.close", "Close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-4 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-lg select-none",
                compareIsFullscreen
                  ? "h-full max-w-none"
                  : "max-w-5xl h-[70vh]",
              )}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                setSliderPos(
                  Math.min(
                    100,
                    Math.max(0, ((e.clientX - rect.left) / rect.width) * 100),
                  ),
                );
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setSliderPos(
                  Math.min(
                    100,
                    Math.max(0, ((e.clientX - rect.left) / rect.width) * 100),
                  ),
                );
              }}
            >
              <img
                src={getAttachmentPreviewUrl(selectedForCompare[1].id)}
                alt={selectedForCompare[1].file_name}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={getAttachmentPreviewUrl(selectedForCompare[0].id)}
                  alt={selectedForCompare[0].file_name}
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                />
              </div>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              />
            </div>
          </div>
          <div
            className="flex items-center justify-between gap-3 px-4 pb-4 text-xs text-[hsl(var(--muted-foreground))]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{selectedForCompare[0].file_name}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="flex-1 max-w-md accent-primary"
              aria-label={t("incidents.imageComparison")}
            />
            <span className="truncate">{selectedForCompare[1].file_name}</span>
          </div>
        </div>
      ) : null}

      {/* Image editor — same replace / save-as-copy flow as IncidentDetailPage. */}
      {editorAttachment ? (
        <Suspense fallback={null}>
          <ImageEditor
            isOpen
            onClose={() => setEditorAttachment(null)}
            imageUrl={getAttachmentUrl(editorAttachment.id)}
            showReplaceButton={
              !!currentUserId &&
              editorAttachment.uploaded_by?.id === currentUserId
            }
            showSaveAsCopyButton
            onSave={(edited) => {
              void replaceImage(edited);
            }}
            onSaveAsCopy={(saved) => {
              void saveAsCopy(saved);
            }}
          />
        </Suspense>
      ) : null}

      <ConfirmationModal
        isOpen={!!pendingDelete}
        onClose={() => {
          if (!deleteMutation.isPending) setPendingDelete(null);
        }}
        onConfirm={confirmDeleteAttachment}
        title={t("confirmations.deleteTitle")}
        message={
          pendingDelete
            ? t("incidents.deleteAttachmentMessage", {
                name: pendingDelete.file_name,
              })
            : ""
        }
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
