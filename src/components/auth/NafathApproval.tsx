import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Smartphone } from "lucide-react";
import { nafathApi } from "../../api/nafath";
import type { NafathApproved, NafathPending } from "../../api/nafath";

interface NafathApprovalProps {
  initial: NafathPending;
  onApproved: (auth: NafathApproved) => Promise<void> | void;
  onFailed: (message: string) => void;
  onCancel: () => void;
}

const errorMessageOf = (err: unknown, fallback: string) => {
  if (typeof err === "object" && err !== null && "response" in err) {
    const data = (err as { response?: { data?: { error?: string } } }).response
      ?.data;
    if (data?.error) return data.error;
  }
  return err instanceof Error ? err.message : fallback;
};

const formatTime = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Shows the number to pick in the Nafath app and polls the backend until the
// person approves it. The backend issues a new number every few seconds; the
// countdowns are local and re-synced from each poll.
export const NafathApproval: React.FC<NafathApprovalProps> = ({
  initial,
  onApproved,
  onFailed,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [pending, setPending] = useState(initial);
  const [syncedAt, setSyncedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [approving, setApproving] = useState(false);
  const callbacks = useRef({ onApproved, onFailed });
  useEffect(() => {
    callbacks.current = { onApproved, onFailed };
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const response = await nafathApi.status(initial.challenge_id);
        if (cancelled) return;
        const data = response.data;
        if (!response.success || !data) {
          callbacks.current.onFailed(response.error || t("auth.loginError"));
          return;
        }
        if (data.status === "approved") {
          setApproving(true);
          await callbacks.current.onApproved(data);
          return;
        }
        setPending(data);
        setSyncedAt(Date.now());
        timer = window.setTimeout(poll, data.poll_interval * 1000);
      } catch (err: unknown) {
        if (!cancelled) {
          callbacks.current.onFailed(errorMessageOf(err, t("auth.loginError")));
        }
      }
    };

    timer = window.setTimeout(poll, initial.poll_interval * 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [initial.challenge_id, initial.poll_interval, t]);

  const elapsed = Math.floor((now - syncedAt) / 1000);
  const rotateIn = Math.max(0, pending.rotate_in - elapsed);
  const expiresIn = Math.max(0, pending.expires_in - elapsed);

  const cancel = () => {
    void nafathApi.cancel(initial.challenge_id).catch(() => undefined);
    onCancel();
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={cancel}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("auth.backToLogin")}
      </button>

      <div className="text-center space-y-2">
        <Smartphone className="w-8 h-8 mx-auto text-emerald-600" />
        <h4 className="text-2xl font-semibold text-slate-900">
          {t("auth.nafathOpenApp")}
        </h4>
        <p className="text-sm text-slate-500">{t("auth.nafathPickNumber")}</p>
      </div>

      <div
        className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 border-emerald-600 bg-emerald-50"
        aria-live="polite"
        aria-label={t("auth.nafathNumberLabel", { number: pending.random })}
        data-testid="nafath-random"
      >
        <span className="text-5xl font-bold tabular-nums text-emerald-700">
          {pending.random}
        </span>
      </div>

      <div className="space-y-2 text-center text-sm text-slate-500">
        {approving ? (
          <p className="flex items-center justify-center gap-2 font-medium text-emerald-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("auth.nafathApproved")}
          </p>
        ) : (
          <>
            <p className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("auth.nafathWaiting")}
            </p>
            <p>{t("auth.nafathNewNumberIn", { seconds: rotateIn })}</p>
            <p className="text-xs">
              {t("auth.nafathExpiresIn", { time: formatTime(expiresIn) })}
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={cancel}
        disabled={approving}
        className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        {t("auth.nafathCancel")}
      </button>
    </div>
  );
};
