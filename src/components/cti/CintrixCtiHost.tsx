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
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
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
  const {
    setIncomingCallNumber,
    setIncomingCallName,
    setOpenCallerIncidents,
    setIsCallerIncidentsMinimized,
  } = useSoftphoneStore();

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
      try {
        const { data } = await apiClient.get<WidgetTokenResponse>(
          "/cti/widget-token",
        );
        if (cancelled || !containerRef.current) return;
        await loadScript(`${data.cintrix_url.replace(/\/$/, "")}/cti-widget.js`);
        if (cancelled || !window.CintrixCTI || !containerRef.current) return;
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
      }
    };
    bootRef.current = () => void boot();
    void boot();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
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
      if (d.call_uuid !== lastCallUuidRef.current) {
        lastCallUuidRef.current = d.call_uuid;
        setIsCallerIncidentsMinimized(false);
      }
    };
    const onAnswered = () => {
      inCallRef.current = true;
    };
    const onEnded = () => {
      inCallRef.current = false;
      setOpenCallerIncidents(false);
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
    </div>
  );
};
