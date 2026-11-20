import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { nafathApi } from "../../api/nafath";
import type { NafathApproved, NafathPending } from "../../api/nafath";

interface NafathApprovalProps {
  initial: NafathPending;
  onApproved: (auth: NafathApproved) => Promise<void> | void;
  onFailed: (message: string) => void;
  onCancel: () => void;
  // Sends a new Nafath request for the same National ID after this one
  // expired (the parent remounts this component with the new request).
  onRestart: () => Promise<void>;
}

const apiErrorOf = (err: unknown, fallback: string) => {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (
      err as {
        response?: { data?: { error?: string; error_code?: string } };
      }
    ).response;
    if (response) {
      return {
        message: response.data?.error || fallback,
        code: response.data?.error_code,
        network: false,
      };
    }
    // An axios error without a response: the request never reached the
    // server (network blip). Not a Nafath answer.
    return { message: fallback, code: undefined, network: true };
  }
  return {
    message: err instanceof Error ? err.message : fallback,
    code: undefined,
    network: false,
  };
};

// A network error is retried this many times in a row before giving up.
const MAX_NETWORK_RETRIES = 3;

// Shows the number to pick in the Nafath app and polls the backend every
// poll_interval seconds. The number stays on screen while Nafath reports the
// request waiting; only Nafath's approval, rejection or expiry (or a gateway
// error) ends it. On expiry the user can send a new request.
export const NafathApproval: React.FC<NafathApprovalProps> = ({
  initial,
  onApproved,
  onFailed,
  onCancel,
  onRestart,
}) => {
  const { t } = useTranslation();
  const [pending, setPending] = useState(initial);
  const [approving, setApproving] = useState(false);
  // Set (to Nafath's own message) once Nafath reports the request expired.
  const [expired, setExpired] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState("");
  const callbacks = useRef({ onApproved, onFailed });
  useEffect(() => {
    callbacks.current = { onApproved, onFailed };
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let networkFailures = 0;

    const poll = async () => {
      try {
        const response = await nafathApi.status(initial.challenge_id);
        if (cancelled) return;
        networkFailures = 0;
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
        // Still pending: keep showing the number and check again.
        setPending(data);
        timer = window.setTimeout(poll, data.poll_interval * 1000);
      } catch (err: unknown) {
        if (cancelled) return;
        const { message, code, network } = apiErrorOf(
          err,
          t("auth.loginError"),
        );
        if (code === "nafath_timeout") {
          setExpired(message);
          return;
        }
        if (network && ++networkFailures <= MAX_NETWORK_RETRIES) {
          timer = window.setTimeout(poll, initial.poll_interval * 1000);
          return;
        }
        callbacks.current.onFailed(message);
      }
    };

    timer = window.setTimeout(poll, initial.poll_interval * 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [initial.challenge_id, initial.poll_interval, t]);

  const cancel = () => {
    if (expired === null) {
      void nafathApi.cancel(initial.challenge_id).catch(() => undefined);
    }
    onCancel();
  };

  const restart = async () => {
    setRestarting(true);
    setRestartError("");
    try {
      await onRestart();
    } catch (err: unknown) {
      setRestartError(apiErrorOf(err, t("auth.loginError")).message);
      setRestarting(false);
    }
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

      {expired !== null ? (
        <div className="space-y-4 text-center" role="alert">
          <Clock className="w-8 h-8 mx-auto text-amber-600" />
          <p className="text-base font-medium text-slate-900">
            {expired || t("auth.nafathExpired")}
          </p>
          {restartError && (
            <p className="text-sm text-red-600">{restartError}</p>
          )}
          <button
            type="button"
            onClick={restart}
            disabled={restarting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            data-testid="nafath-send-new"
          >
            {restarting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {t("auth.nafathSendNew")}
          </button>
        </div>
      ) : (
        <>
          <div className="text-center space-y-2">
            <Smartphone className="w-8 h-8 mx-auto text-emerald-600" />
            <h4 className="text-2xl font-semibold text-slate-900">
              {t("auth.nafathOpenApp")}
            </h4>
            <p className="text-sm text-slate-500">
              {t("auth.nafathPickNumber")}
            </p>
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
              <p className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("auth.nafathWaiting")}
              </p>
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
        </>
      )}
    </div>
  );
};
