/**
 * Hosts the embedded Cintrix CTI widget and bridges its DOM events into
 * Automax state — driving the SAME store fields the native softphone used, so
 * every existing call-driven behavior (caller-incidents pop, sentiment stats)
 * fires unchanged. Spec §7.2.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "@/api/client";
import { useSoftphoneStore } from "@/stores/softphoneStore";
import usePermissions from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { CallerSentimentModal } from "./CallerSentimentModal";

interface WidgetTokenResponse {
  cintrix_url: string;
  token: string;
  expires_in: number;
  extension?: string;
  sip_wss_url?: string;
  stun_url?: string;
  turn_url?: string;
  turn_username?: string;
  turn_password?: string;
}

declare global {
  interface Window {
    CintrixCTI?: {
      init: (_opts: {
        backendUrl: string;
        token: string;
        container: string | HTMLElement;
        sipWssUrl?: string;
        iceServers?: RTCIceServer[];
      }) => void;
      destroy: () => void;
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // Only trust an existing tag if the widget global actually arrived —
      // a tag left over from a FAILED load would otherwise dedup-resolve
      // here and poison every retry. Remove the stale tag and load fresh.
      if (window.CintrixCTI) return resolve();
      existing.remove();
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => {
      // Remove the failed tag so the next attempt loads fresh instead of
      // finding a script element that never executed.
      s.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(s);
  });
}

const RETRY_MS = 60_000;

export const CintrixCtiHost: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  // True from cintrix:incoming-call / cintrix:call-answered until
  // cintrix:call-ended. Read by the token-refresh loop below.
  const inCallRef = useRef(false);
  // Lets the Retry button re-run boot() without remounting the component.
  const bootRef = useRef<() => void>(() => {});
  // True while a boot() attempt is in flight; collapses concurrent attempts.
  const bootingRef = useRef(false);
  const {
    setIncomingCallNumber,
    setIncomingCallName,
    setOpenCallerIncidents,
    setIsCallerIncidentsMinimized,
  } = useSoftphoneStore();
  const { hasPermission } = usePermissions();
  const canCreateSentiment = hasPermission(PERMISSIONS.CALLER_SENTIMENT_CREATE);
  // Post-call sentiment prompt (parity with the native softphone's modal,
  // Softphone.tsx ~line 727). Only one at a time — a fresh call-ended simply
  // replaces whatever was pending.
  const [sentimentPrompt, setSentimentPrompt] = useState<{
    number: string;
    durationSeconds: number;
    callUuid: string;
  } | null>(null);

  // Mount widget + token-refresh/retry loop
  useEffect(() => {
    let cancelled = false;
    // Single pending-timer slot shared by refresh and retry (at most one is
    // ever scheduled at a time); always cleared on unmount.
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (fn: () => void, ms: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };

    const scheduleRefresh = (ms: number) => {
      schedule(() => {
        // Never re-init the widget under a live call: init() rebuilds the
        // Shadow-DOM UI and would drop the active SIP session. Defer the
        // token refresh until the call has ended.
        if (inCallRef.current) scheduleRefresh(RETRY_MS);
        else void boot();
      }, ms);
    };

    const boot = async () => {
      // In-flight guard: a timer firing while a manual Retry is running (or
      // a double-click on Retry) must collapse to a single boot attempt.
      if (bootingRef.current) return;
      bootingRef.current = true;
      try {
        const { data } = await apiClient.get<WidgetTokenResponse>(
          "/cti/widget-token",
        );
        if (cancelled || !containerRef.current) return;
        await loadScript(`${data.cintrix_url.replace(/\/$/, "")}/cti-widget.js`);
        if (cancelled || !containerRef.current) return;
        if (!window.CintrixCTI) {
          // Script "loaded" but never defined the global (poisoned cache,
          // wrong asset, blocked eval...). THROW so the catch path engages
          // (banner + auto-retry) instead of silently dying with no timer.
          throw new Error("cti-widget.js loaded but CintrixCTI is undefined");
        }
        const iceServers: RTCIceServer[] = [];
        if (data.stun_url) iceServers.push({ urls: data.stun_url.split(",") });
        if (data.turn_url)
          iceServers.push({
            urls: data.turn_url.split(","),
            username: data.turn_username || undefined,
            credential: data.turn_password || undefined,
          });
        window.CintrixCTI.init({
          backendUrl: data.cintrix_url,
          token: data.token,
          container: containerRef.current,
          sipWssUrl: data.sip_wss_url,
          iceServers,
        });
        setError("");
        // Re-mint before expiry (widget keeps its SIP registration through it).
        scheduleRefresh(Math.max((data.expires_in - 300) * 1000, RETRY_MS));
      } catch {
        if (cancelled) return;
        setError("Call system unavailable");
        // Auto-recover: keep retrying without requiring the Retry button.
        schedule(() => void boot(), RETRY_MS);
      } finally {
        bootingRef.current = false;
      }
    };
    // Manual Retry goes through the same timer discipline as the automatic
    // paths: clear any pending refresh/retry timer, then boot (the in-flight
    // guard absorbs a timer that fires mid-flight or a double-click).
    bootRef.current = () => {
      if (timer) clearTimeout(timer);
      void boot();
    };
    void boot();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      // Released in cleanup so StrictMode's remount (or any future remount)
      // is never blocked by this doomed closure's in-flight boot; its
      // pending promise no-ops at the `cancelled` checkpoints.
      bootingRef.current = false;
      window.CintrixCTI?.destroy();
    };
  }, []);

  // Bridge widget events → Automax behaviors (screen-pop parity).
  // NOTE: cintrix:incoming-call fires TWICE per call (first with
  // name/contact_id null, then enriched once the lookup resolves — same
  // call_uuid). Treat this as an idempotent upsert: just re-set the store
  // values, never toggle/append/reset in a way double-firing would break.
  const lastCallUuidRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const onIncoming = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      inCallRef.current = true;
      setIncomingCallNumber(d.number || "Unknown");
      setIncomingCallName(d.name || "");
      setOpenCallerIncidents(true);
      // Only un-minimize for a NEW call: the enriched second fire of the
      // same call_uuid must not re-expand a panel the agent just minimized.
      // A missing call_uuid is treated as always-novel so two uuid-less
      // calls in a row still re-expand the panel.
      const novel = !d.call_uuid || d.call_uuid !== lastCallUuidRef.current;
      if (novel) {
        lastCallUuidRef.current = d.call_uuid;
        setIsCallerIncidentsMinimized(false);
      }
    };
    const onAnswered = () => {
      inCallRef.current = true;
    };
    const onEnded = (e: Event) => {
      inCallRef.current = false;
      setOpenCallerIncidents(false);
      const d = (e as CustomEvent).detail || {};
      if (
        canCreateSentiment &&
        d.outcome === "answered" &&
        (d.duration_seconds ?? 0) > 0
      ) {
        setSentimentPrompt({
          number: d.number || "",
          durationSeconds: d.duration_seconds,
          callUuid: d.call_uuid || "",
        });
      }
    };
    const onCreateIncident = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      navigate("/incidents/new", {
        state: {
          ctiPrefill: {
            reporter_phone: d.number || "",
            reporter_name: d.name || "",
            source: "call",
            call_uuid: d.call_uuid || "",
          },
        },
      });
    };
    window.addEventListener("cintrix:incoming-call", onIncoming);
    window.addEventListener("cintrix:call-answered", onAnswered);
    window.addEventListener("cintrix:call-ended", onEnded);
    window.addEventListener("cintrix:create-incident", onCreateIncident);
    return () => {
      window.removeEventListener("cintrix:incoming-call", onIncoming);
      window.removeEventListener("cintrix:call-answered", onAnswered);
      window.removeEventListener("cintrix:call-ended", onEnded);
      window.removeEventListener("cintrix:create-incident", onCreateIncident);
    };
  }, [
    navigate,
    setIncomingCallNumber,
    setIncomingCallName,
    setOpenCallerIncidents,
    setIsCallerIncidentsMinimized,
    canCreateSentiment,
  ]);

  // The container div is ALWAYS rendered: a failed token refresh must not
  // yank a live widget's DOM out from under it. The error banner renders
  // adjacent (above), never instead.
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => bootRef.current()}
          >
            Retry
          </button>
        </div>
      )}
      <div ref={containerRef} />
      {sentimentPrompt && (
        <CallerSentimentModal
          number={sentimentPrompt.number}
          durationSeconds={sentimentPrompt.durationSeconds}
          callUuid={sentimentPrompt.callUuid}
          onClose={() => setSentimentPrompt(null)}
        />
      )}
    </div>
  );
};
