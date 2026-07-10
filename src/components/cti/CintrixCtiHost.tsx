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

export const CintrixCtiHost: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const {
    setIncomingCallNumber,
    setIncomingCallName,
    setOpenCallerIncidents,
    setIsCallerIncidentsMinimized,
  } = useSoftphoneStore();

  // Mount widget
  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

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
        // Re-mint before expiry (widget keeps its SIP registration through it).
        refreshTimer = setTimeout(
          boot,
          Math.max((data.expires_in - 300) * 1000, 60_000),
        );
      } catch {
        if (!cancelled) setError("Call system unavailable");
      }
    };
    void boot();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      window.CintrixCTI?.destroy();
    };
  }, []);

  // Bridge widget events → Automax behaviors (screen-pop parity).
  // NOTE: cintrix:incoming-call fires TWICE per call (first with
  // name/contact_id null, then enriched once the lookup resolves — same
  // call_uuid). Treat this as an idempotent upsert: just re-set the store
  // values, never toggle/append/reset in a way double-firing would break.
  useEffect(() => {
    const onIncoming = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setIncomingCallNumber(d.number || "Unknown");
      setIncomingCallName(d.name || "");
      setOpenCallerIncidents(true);
      setIsCallerIncidentsMinimized(false);
    };
    const onEnded = () => {
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
    window.addEventListener("cintrix:call-ended", onEnded);
    window.addEventListener("cintrix:create-incident", onCreateIncident);
    return () => {
      window.removeEventListener("cintrix:incoming-call", onIncoming);
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

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {error ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  );
};
