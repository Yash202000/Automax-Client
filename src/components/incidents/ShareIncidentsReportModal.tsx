import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Share2,
} from "lucide-react";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../ui";
import { incidentApi } from "../../api/admin";

type ShareableIncident = { id: string; incident_number?: string };

interface ShareIncidentsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: ShareableIncident[];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Four random uppercase letters, e.g. "KQXM". */
const randomLetters = (length = 4) =>
  Array.from({ length }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join("");

/**
 * Incident_INC-1042.pdf for one incident, Incidents_18-Nov-2026_KQXM.pdf for
 * several; the random letters keep same-day reports from sharing a name.
 */
const getIncidentReportFileName = (
  incidents: ShareableIncident[],
  date: Date = new Date(),
) => {
  if (incidents.length === 1) {
    const number = incidents[0].incident_number || incidents[0].id;
    return `Incident_${number}.pdf`;
  }
  const day = String(date.getDate()).padStart(2, "0");
  return `Incidents_${day}-${MONTHS[date.getMonth()]}-${date.getFullYear()}_${randomLetters()}.pdf`;
};

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** The API returns a blob even on errors, so read the JSON error out of it. */
const readErrorMessage = async (err: unknown): Promise<string | undefined> => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.error || parsed?.message;
    } catch {
      return undefined;
    }
  }
  const obj = data as { error?: string; message?: string } | undefined;
  return obj?.error || obj?.message;
};

type Status = "loading" | "ready" | "error";

export function ShareIncidentsReportModal({
  isOpen,
  onClose,
  incidents,
}: ShareIncidentsReportModalProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("loading");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const incidentsRef = useRef<ShareableIncident[]>(incidents);

  const count = incidentsRef.current.length;
  const canNativeShare =
    !!file &&
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setErrorMessage("");
    try {
      const list = incidentsRef.current;
      const blob = await incidentApi.generateReport(
        list.map((i) => i.id),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const pdf = new File([blob], getIncidentReportFileName(list), {
        type: "application/pdf",
      });
      setFile(pdf);
      setFileUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(pdf);
      });
      setStatus("ready");
    } catch (err) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        (await readErrorMessage(err)) ||
          t("incidents.share.generateFailedDesc"),
      );
      setStatus("error");
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen) return;
    incidentsRef.current = incidents;
    setFile(null);
    void generate();
    return () => abortRef.current?.abort();
    // Only regenerate when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !fileUrl) return;
    URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
  }, [isOpen, fileUrl]);

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const download = () => {
    if (!file || !fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const nativeShare = async () => {
    if (!file) return;
    download();
    if (!canNativeShare) return;
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        toast.error(t("incidents.share.shareFailed"));
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      closeOnOverlayClick={status !== "loading"}
    >
      <ModalHeader>
        <ModalTitle>{t("incidents.share.title")}</ModalTitle>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {status === "loading" && (
          <div
            className="flex flex-col items-center gap-3 py-6 text-center"
            aria-busy="true"
            role="status"
          >
            <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--primary))]" />
            <div>
              <p className="font-semibold text-[hsl(var(--foreground))]">
                {t("incidents.share.generating", { count })}
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t("incidents.share.generatingHint")}
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div className="h-full w-1/3 animate-[share-progress_1.2s_ease-in-out_infinite] rounded-full bg-[hsl(var(--primary))]" />
            </div>
            <style>{`@keyframes share-progress{from{transform:translateX(-100%)}to{transform:translateX(300%)}}`}</style>
          </div>
        )}

        {status === "error" && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">
                {t("incidents.share.generateFailed")}
              </p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {status === "ready" && file && (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3">
              <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-[10px] font-bold text-red-600">
                PDF
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[hsl(var(--foreground))]">
                  {file.name}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("incidents.share.fileMeta", {
                    count,
                    size: formatSize(file.size),
                  })}
                </p>
              </div>
              <CheckCircle2 className="ms-auto h-5 w-5 shrink-0 text-green-600" />
            </div>

            <Button
              className="w-full"
              onClick={nativeShare}
              leftIcon={
                canNativeShare ? (
                  <Share2 className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )
              }
            >
              {canNativeShare
                ? t("incidents.share.shareButton")
                : t("incidents.share.download")}
            </Button>
          </>
        )}
      </ModalBody>

      <ModalFooter>
        {/* Cancel is always available; it also aborts a running generation. */}
        <Button variant="ghost" className="me-auto" onClick={handleClose}>
          {t("common.cancel")}
        </Button>
        {status === "error" && (
          <Button
            onClick={() => void generate()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {t("common.retry", "Retry")}
          </Button>
        )}
        {status === "ready" && (
          <>
            <Button
              variant="outline"
              onClick={() =>
                fileUrl && window.open(fileUrl, "_blank", "noopener")
              }
              leftIcon={<ExternalLink className="h-4 w-4" />}
            >
              {t("incidents.share.open")}
            </Button>
            <Button
              variant="outline"
              onClick={download}
              leftIcon={<Download className="h-4 w-4" />}
            >
              {t("incidents.share.download")}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
