import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { incidentApi } from "../../../../api/admin";
import type { NasaqVerificationResult } from "../../../../types";

function ResultRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <div className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
        {label}
      </div>
      <div className="text-xs font-medium text-[hsl(var(--foreground))] mt-0.5 break-words">
        {value}
      </div>
    </div>
  );
}

/* Nasaq verification tab — same manual-only flow as IncidentDetailPage:
   latest result loads (never auto re-verified); a fresh verification runs
   only on button click. Rendered only for is_nasaq classifications with
   the verify permission (gated by the parent). */
export function NasaqTab({ incidentId }: { incidentId: string }) {
  const { t } = useTranslation();
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<NasaqVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: latestResponse } = useQuery({
    queryKey: ["incidents", "v2-list", "nasaq", incidentId],
    queryFn: () => incidentApi.getNasaqVerification(incidentId),
    enabled: !!incidentId,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (latestResponse?.data) setResult(latestResponse.data);
  }, [latestResponse]);

  const handleVerify = async () => {
    if (!incidentId) return;
    setVerifying(true);
    setError(null);
    try {
      const response = await incidentApi.verifyNasaq(incidentId);
      setResult(response.data ?? null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Nasaq verification failed:", err);
      setError(t("incidents.nasaqVerifyFailed"));
    } finally {
      setVerifying(false);
    }
  };

  const statusTone =
    result?.status === "MATCHED"
      ? "text-emerald-700 dark:text-emerald-400"
      : result?.status === "NO_MATCH"
        ? "text-[hsl(var(--muted-foreground))]"
        : result?.status === "REVIEW_REQUIRED"
          ? "text-amber-700 dark:text-amber-400"
          : "text-rose-700 dark:text-rose-400";

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[hsl(var(--border))]">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider leading-none">
            {t("incidents.nasaqVerification")}
          </h3>
        </div>

        {verifying ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            {t("incidents.verifyingNasaq")}
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <XCircle className="h-4 w-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs text-rose-700 dark:text-rose-300">
                {error}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleVerify();
              }}
              className="px-3.5 py-1.5 bg-[hsl(var(--muted)/0.9)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-all shadow-sm"
            >
              {t("incidents.verifyAgain")}
            </button>
          </div>
        ) : !result ? (
          <button
            type="button"
            onClick={() => {
              void handleVerify();
            }}
            className="px-3.5 py-1.5 bg-[hsl(var(--muted)/0.9)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t("incidents.verifyNasaq")}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.status === "MATCHED" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              ) : result.status === "NO_MATCH" ? (
                <XCircle className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              ) : result.status === "REVIEW_REQUIRED" ? (
                <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-700 dark:text-rose-400" />
              )}
              <span className={cn("text-sm font-semibold", statusTone)}>
                {result.status === "MATCHED" &&
                  t("incidents.nasaqStatusMatched")}
                {result.status === "NO_MATCH" &&
                  t("incidents.nasaqStatusNoMatch")}
                {result.status === "REVIEW_REQUIRED" &&
                  t("incidents.nasaqStatusReviewRequired")}
                {result.status === "ERROR" && t("incidents.nasaqStatusError")}
              </span>
            </div>

            {result.status === "REVIEW_REQUIRED" ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("incidents.nasaqReviewRequiredMessage")}
              </p>
            ) : null}

            {result.status === "ERROR" &&
            (result.errorMessage || result.message) ? (
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {result.errorMessage || result.message}
              </p>
            ) : null}

            {result.status === "MATCHED" && result.nasaqData ? (
              <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <ResultRow
                  label={t("incidents.nasaqPermitNumber")}
                  value={result.permitNumber ?? undefined}
                />
                <ResultRow
                  label={t("incidents.nasaqPermitStatus")}
                  value={result.nasaqData.permitStatusName}
                />
                <ResultRow
                  label={t("incidents.nasaqPermitExpiry")}
                  value={result.nasaqData.permitExpiryDate}
                />
                <ResultRow
                  label={t("incidents.nasaqWarrantyExpiry")}
                  value={result.nasaqData.permitWarrantyExpiryDate}
                />
                <ResultRow
                  label={t("incidents.nasaqWarrantyStatus")}
                  value={result.nasaqData.warrantyStatus}
                />
                <ResultRow
                  label={t("incidents.nasaqContractorName")}
                  value={result.nasaqData.mainContractorName}
                />
                <ResultRow
                  label={t("incidents.nasaqContractorPmName")}
                  value={result.nasaqData.mainContractorProjectManagerName}
                />
                <ResultRow
                  label={t("incidents.nasaqContractorPmMobile")}
                  value={result.nasaqData.mainContractorProjectManagerMobile}
                />
                <ResultRow
                  label={t("incidents.nasaqPolygonPathId")}
                  value={result.nasaqData.polygonPathId}
                />
                {typeof result.distance === "number" ? (
                  <ResultRow
                    label={t("incidents.nasaqDistance")}
                    value={`${result.distance.toFixed(2)} m`}
                  />
                ) : null}
                <ResultRow
                  label={t("incidents.nasaqResponseId")}
                  value={result.responseId}
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2 border-t border-dashed border-[hsl(var(--border))] gap-2 flex-wrap">
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {t("incidents.nasaqLastCheckedOn")} {result.retrievedAt}
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleVerify();
                }}
                className="px-3.5 py-1.5 bg-[hsl(var(--muted)/0.9)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-all shadow-sm"
              >
                {t("incidents.verifyAgain")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
