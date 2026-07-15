import React, { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import sipService from "../../lib/services/sipService";
import { useSoftphoneStore } from "@/stores/softphoneStore";
import { publicUrl } from "@/utils/publicUrl";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  X,
  GripHorizontal,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Delete,
  Settings,
  Clock,
  BarChart2,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { callerFeedbackApi, extensionApi } from "@/api/admin";
import { useAuthStore } from "@/stores/authStore";
import { v4 as uuid } from "uuid";
import usePermissions from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";

/* -------------------- Types -------------------- */

interface User {
  userID: string;
  extension?: string;
}

interface Auth {
  user?: User;
  accessToken?: string;
}

interface Setting {
  socketURL?: string;
  domain?: string;
}

interface SoftPhoneProps {
  showSip: boolean;
  onClose?: () => void;
  settings: Setting;
  auth: Auth;
  findByID?: (id: string) => User | undefined;
}

type CallStatus =
  | "idle"
  | "dialing"
  | "ringing"
  | "incoming"
  | "connected"
  | "ended";

/* -------------------- Audio Utils -------------------- */

// Create a persistent audio element for remote stream (singleton)
let remoteAudioElement: HTMLAudioElement | null = null;
const getRemoteAudioElement = (): HTMLAudioElement => {
  if (!remoteAudioElement) {
    remoteAudioElement = document.createElement("audio");
    remoteAudioElement.autoplay = true;
    remoteAudioElement.id = "softphone-remote-audio";
    document.body.appendChild(remoteAudioElement);
  }
  return remoteAudioElement;
};

// Singleton timer to prevent duplicates
let globalTimerRef: ReturnType<typeof setTimeout> | null = null;
let globalCallDuration = 0;

/* -------------------- Dialpad Keys -------------------- */

const dialpadKeys = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

const SENTIMENTS = (t: any) =>
  [
    { key: 1, emoji: "😡", label: t("softphone.sentiment.angry") },
    { key: 2, emoji: "😠", label: t("softphone.sentiment.upset") },
    { key: 3, emoji: "😐", label: t("softphone.sentiment.normal") },
    { key: 4, emoji: "😊", label: t("softphone.sentiment.satisfied") },
    {
      key: 5,
      emoji: "😄",
      label: t("softphone.sentiment.verySatisfied"),
    },
  ] as const;

/* -------------------- Component -------------------- */

const SentimentStats: React.FC<{
  calleeId: string;
  callerId: string;
  t: any;
}> = ({ calleeId, callerId, t }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["caller-sentiment-stats", calleeId],
    queryFn: () =>
      callerFeedbackApi.get({ callee_id: calleeId, caller_id: callerId }),
    enabled: !!calleeId && !!callerId,
  });

  const barColour = (key: number) =>
    [
      "bg-red-500",
      "bg-orange-400",
      "bg-yellow-400",
      "bg-emerald-400",
      "bg-green-500",
    ][key - 1] ?? "bg-gray-300";

  const response = data as any;

  const raw: Array<{ sentiment: number; count: number; percent: number }> =
    response?.summary ?? [];

  const summary = SENTIMENTS(t).map((def) => {
    const match = raw.find((r) => r.sentiment === def.key);
    return { ...def, count: match?.count ?? 0, percent: match?.percent ?? 0 };
  });

  const totalCalls = response?.calls?.length ?? 0;
  const dominant = response?.dominant ?? null;

  if (isLoading)
    return (
      <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-white p-3 animate-pulse">
        <div className="h-3 bg-gray-100 rounded mb-2 w-24" />
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded-full" />
          ))}
        </div>
      </div>
    );

  if (isError || totalCalls === 0)
    return (
      <div className="mx-4 mb-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
        <BarChart2 className="w-4 h-4 text-gray-300 mx-auto mb-1" />
        <p className="text-xs text-gray-400">
          {t("softphone.noCallerHistory")}
        </p>
      </div>
    );

  return (
    <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {t("softphone.callerHistory")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {dominant && (
            <span
              className="text-sm"
              title={SENTIMENTS(t).find((s) => s.key === dominant)?.label}
            >
              {SENTIMENTS(t).find((s) => s.key === dominant)?.emoji}
            </span>
          )}
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {totalCalls} {t("softphone.calls")}
          </span>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
        {summary.map((s) =>
          s.percent > 0 ? (
            <div
              key={s.key}
              className={barColour(s.key)}
              style={{ width: `${s.percent}%` }}
            />
          ) : null,
        )}
      </div>

      {/* Per-sentiment rows */}
      <div className="space-y-1.5">
        {summary.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="text-sm w-5 text-center leading-none">
              {s.emoji}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`${barColour(s.key)} h-full rounded-full transition-all duration-500`}
                style={{ width: `${s.percent}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 w-7 text-right tabular-nums">
              {s.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SoftPhone({
  showSip,
  onClose,
  settings,
  auth,
}: SoftPhoneProps) {
  const { t } = useTranslation();
  const dragRef = useRef<HTMLDivElement | null>(null);
  const { hasPermission } = usePermissions();

  const {
    isConnected: sipConnected,
    setConnected: setSipConnected,
    isConnecting,
    setConnecting: setIsConnecting,
    shouldConnect,
    setShouldConnect,
    setOpenCallerIncidents,
    setIsCallerIncidentsMinimized,
    setIncomingCallNumber,
    setIncomingCallName,
  } = useSoftphoneStore();

  const [dialedNumber, setDialedNumber] = useState<string>("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callEndReason, setCallEndReason] = useState<string>("");

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [, setActiveCall] = useState<any>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Extension credentials
  const [sipPassword] = useState<string>(
    import.meta.env.VITE_SIP_PASSWORD || "51234",
  );
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);

  const [showSentimentModal, setShowSentimentModal] = useState<boolean>(false);
  const [callSummary, setCallSummary] = useState<{
    number: string;
    duration: number;
    calleeId: string;
  } | null>();

  const [selectedSentiment, setSelectedSentiment] = useState<any | null>(null);
  const { user, setUser } = useAuthStore();
  const setIsOpen = useSoftphoneStore((state) => state.setIsOpen);
  const canCreateSentiment = hasPermission(PERMISSIONS.CALLER_SENTIMENT_CREATE);
  const canViewSentiment = hasPermission(PERMISSIONS.CALLER_SENTIMENT_VIEW);
  const isEPM940 =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";
  const canAssignExtensions = hasPermission(PERMISSIONS.EXTENSIONS_ASSIGN);

  const { data: extensionsData, isLoading: extensionsLoading } = useQuery({
    queryKey: ["extensions"],
    queryFn: () => extensionApi.list(),
    enabled: canAssignExtensions && showPasswordPrompt,
  });

  const availableExtensions = (extensionsData?.data || []).filter(
    (ext: any) => ext.status === "available",
  );

  const [selectedExtension, setSelectedExtension] = useState<string>("");

  const assignExtensionMutation = useMutation({
    mutationFn: (payload: { extension: string }) =>
      extensionApi.assign(payload),
    onSuccess: () => {
      toast.success(
        t("users.extensionAssignedSuccessfully", {
          defaultValue: "Extension assigned successfully",
        }),
      );
      setShowPasswordPrompt(false);

      if (user) {
        setUser({ ...user, extension: selectedExtension });
      }

      if (sipConnected) {
        sipService.stop();
        setSipConnected(false);
      } else {
        setShouldConnect(true);
      }
    },
    onError: () => {
      toast.error(
        t("users.extensionAssignmentFailed", {
          defaultValue: "Failed to assign extension",
        }),
      );
    },
  });

  useEffect(() => {
    if (showPasswordPrompt) {
      setSelectedExtension(auth?.user?.extension || "");
    }
  }, [showPasswordPrompt, auth?.user?.extension]);

  const wasIncomingCallRef = useRef(false);
  const dialedNumberRef = useRef("");
  // Guards the "no extension" toast so it fires once per session even if the
  // effect below re-runs on settings/auth updates.
  const missingExtensionToastShownRef = useRef(false);
  const [, setMissingExtension] = useState<boolean>(false);

  const canCreateSentimentRef = useRef(false);
  const ringRef = useRef<HTMLAudioElement | null>(null);

  const callingToneCtxRef = useRef<AudioContext | null>(null);
  const callingToneIntervalRef = useRef<any>(null);

  const playCallingTone = useCallback(() => {
    if (callingToneCtxRef.current) return;

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const ctx = new AudioContextClass();
      callingToneCtxRef.current = ctx;

      const playTone = () => {
        if (
          !callingToneCtxRef.current ||
          callingToneCtxRef.current.state === "closed"
        )
          return;

        try {
          const osc1 = callingToneCtxRef.current.createOscillator();
          const osc2 = callingToneCtxRef.current.createOscillator();
          const gainNode = callingToneCtxRef.current.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(
            440,
            callingToneCtxRef.current.currentTime,
          );

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(
            480,
            callingToneCtxRef.current.currentTime,
          );

          gainNode.gain.setValueAtTime(
            0,
            callingToneCtxRef.current.currentTime,
          );
          gainNode.gain.linearRampToValueAtTime(
            0.08,
            callingToneCtxRef.current.currentTime + 0.1,
          );
          gainNode.gain.setValueAtTime(
            0.08,
            callingToneCtxRef.current.currentTime + 2.0,
          );
          gainNode.gain.linearRampToValueAtTime(
            0,
            callingToneCtxRef.current.currentTime + 2.1,
          );

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(callingToneCtxRef.current.destination);

          osc1.start();
          osc2.start();

          setTimeout(() => {
            try {
              osc1.stop();
              osc1.disconnect();
            } catch (e) {
              console.error(e);
            }
            try {
              osc2.stop();
              osc2.disconnect();
            } catch (e) {
              console.error(e);
            }
            try {
              gainNode.disconnect();
            } catch (e) {
              console.error(e);
            }
          }, 2200);
        } catch (e) {
          console.error("Error playing calling tone chunk:", e);
        }
      };

      playTone();
      callingToneIntervalRef.current = setInterval(playTone, 6000);
    } catch (err) {
      console.warn("Failed to initialize calling tone AudioContext:", err);
    }
  }, []);

  const stopCallingTone = useCallback(() => {
    if (callingToneIntervalRef.current) {
      clearInterval(callingToneIntervalRef.current);
      callingToneIntervalRef.current = null;
    }

    if (callingToneCtxRef.current) {
      try {
        callingToneCtxRef.current.close();
      } catch (e) {
        console.log(e);
      }
      callingToneCtxRef.current = null;
    }
  }, []);

  // Initialize ringtone audio and prime it on first interaction
  useEffect(() => {
    const audio = new Audio(publicUrl("phone_ring.mp3"));
    audio.loop = true;
    ringRef.current = audio;

    const primeAudio = () => {
      console.log("🔔 Priming softphone audio...");
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          console.log("🔔 Softphone audio primed successfully");
        })
        .catch((err) => {
          console.log("🔔 Softphone audio prime deferred:", err.message);
        });
      document.removeEventListener("click", primeAudio);
    };

    document.addEventListener("click", primeAudio);

    return () => {
      document.removeEventListener("click", primeAudio);
      audio.pause();
      ringRef.current = null;
      stopCallingTone();
    };
  }, [stopCallingTone]);

  useEffect(() => {
    canCreateSentimentRef.current = canCreateSentiment;
  }, [canCreateSentiment]);

  /* ---------------- SIP CONNECTION ---------------- */

  // Initialize persistent audio element on mount
  useEffect(() => {
    getRemoteAudioElement();
  }, []);

  // Depend on the primitive fields we actually use so the effect is stable
  // across unrelated parent re-renders that pass fresh object literals for
  // `settings` / `auth`. Previously this effect ran on every parent render,
  // which — combined with tryConnect's error path that flipped the softphone
  // zustand store — produced an infinite render loop when the user had no
  // extension configured.
  const extension = auth?.user?.extension ?? "";
  const socketURL = settings?.socketURL ?? "";
  const domain = settings?.domain ?? "";

  const tryConnect = useCallback((): void => {
    // Only return if we're already connecting OR if we're connected AND the service is active
    if (isConnecting) return;
    if (sipConnected && sipService.isInitialized()) return;

    if (!extension) {
      setMissingExtension(true);
      if (!missingExtensionToastShownRef.current) {
        missingExtensionToastShownRef.current = true;
        toast.error(
          "No extension configured for your account. Please contact your administrator to set up your extension.",
        );
      }
      return;
    }

    setMissingExtension(false);
    const password =
      sipPassword || import.meta.env.VITE_SIP_PASSWORD || "51234";

    if (socketURL && domain) {
      setIsConnecting(true);
      setShouldConnect(true); // Remember we want to be connected
      sipService.init({
        username: extension,
        password,
        domain,
        socketUrl: socketURL,
      });
    }
  }, [
    sipConnected,
    isConnecting,
    extension,
    socketURL,
    domain,
    sipPassword,
    setIsConnecting,
    setShouldConnect,
  ]);

  // Auto-connect on mount or when credentials become available if shouldConnect is true
  useEffect(() => {
    if (
      shouldConnect &&
      !sipConnected &&
      !isConnecting &&
      extension &&
      socketURL &&
      domain
    ) {
      tryConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldConnect, extension, socketURL, domain]);

  const handleDisconnect = (): void => {
    sipService.stop();
    setSipConnected(false);
    setIsConnecting(false);
    setShouldConnect(false); // Explicitly reset the auto-connect flag
    setOpenCallerIncidents(false);
  };

  /* ---------------- SIP EVENTS ---------------- */

  useEffect(() => {
    const incomingHandler = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const session = ce.detail.session;
      setShowSentimentModal(false);
      setIncomingCall(session);
      wasIncomingCallRef.current = true;
      dialedNumberRef.current =
        session?.remote_identity?.uri?.user ?? "Unknown";
      setIncomingCallNumber(session?.remote_identity?.uri?.user ?? "Unknown");
      setIncomingCallName("");
      setOpenCallerIncidents(true);
      setIsCallerIncidentsMinimized(false);
      setDialedNumber(session?.remote_identity?.uri?.user ?? "Unknown");
      setCallStatus("incoming");
      setIsOpen(true); // Auto-show softphone on incoming call
      playRingtone();
    };

    const registeredHandler = () => {
      setSipConnected(true);
      setIsConnecting(false);
    };

    const failedHandler = () => {
      setSipConnected(false);
      setIsConnecting(false);
    };

    const callConnectedHandler = () => {
      setCallStatus("connected");

      if (!globalTimerRef) {
        startTimer();
      }
      stopRingtone();
      stopCallingTone();
    };

    const callRingingHandler = () => {
      setCallStatus((prev) => (prev === "dialing" ? "ringing" : prev));
    };

    const callEndedHandler = (e: Event) => {
      const ce = e as CustomEvent<{ cause?: string }>;
      const cause = ce.detail?.cause;

      if (cause) {
        console.log("📞 Call failed/ended with cause:", cause);
        let reasonText = "";
        if (cause === "Busy") {
          reasonText = t("softphone.busy", "Line is busy");
          toast.error(reasonText);
        } else if (cause === "Rejected") {
          reasonText = t("softphone.rejected", "Call declined");
          toast.error(reasonText);
        } else if (
          cause === "Unavailable" ||
          cause === "Temporarily Unavailable"
        ) {
          reasonText = t("softphone.unavailable", "User is unavailable");
          toast.error(reasonText);
        } else if (cause === "Not Found") {
          reasonText = t("softphone.notFound", "Number not found");
          toast.error(reasonText);
        } else if (cause !== "Canceled") {
          reasonText = `${t("softphone.failed", "Call failed")}: ${cause}`;
          toast.error(reasonText);
        }

        if (reasonText) {
          setCallEndReason(reasonText);
          setCallStatus("ended");
          setTimeout(() => {
            cleanup();
            setCallEndReason("");
          }, 3000);
          return;
        }
      }

      setCallStatus("ended");
      cleanup();
    };

    const remoteStreamHandler = (e: Event) => {
      const ce = e as CustomEvent<MediaStream>;
      const stream = ce.detail;

      if (stream) {
        const audioEl = getRemoteAudioElement();
        audioEl.srcObject = stream;
        audioEl.volume = 1;
        audioEl.muted = false;
        audioEl.play().catch(() => {});
      }
    };

    const initiateCallHandler = (e: Event) => {
      const ce = e as CustomEvent<{ number: string }>;
      if (ce.detail && ce.detail.number) {
        setDialedNumber(ce.detail.number);
        // Optional: auto-dial if desired
        // makeCall();
      }
    };

    window.addEventListener("incoming-call", incomingHandler as EventListener);
    window.addEventListener("sip-registered", registeredHandler);
    window.addEventListener("sip-registration-failed", failedHandler);
    window.addEventListener("call-connected", callConnectedHandler);
    window.addEventListener("call-ringing", callRingingHandler);
    window.addEventListener("call-ended", callEndedHandler);
    window.addEventListener(
      "remote-stream",
      remoteStreamHandler as EventListener,
    );
    window.addEventListener(
      "initiate-call",
      initiateCallHandler as EventListener,
    );

    return () => {
      window.removeEventListener(
        "incoming-call",
        incomingHandler as EventListener,
      );
      window.removeEventListener("sip-registered", registeredHandler);
      window.removeEventListener("sip-registration-failed", failedHandler);
      window.removeEventListener("call-connected", callConnectedHandler);
      window.removeEventListener("call-ringing", callRingingHandler);
      window.removeEventListener("call-ended", callEndedHandler);
      window.removeEventListener(
        "remote-stream",
        remoteStreamHandler as EventListener,
      );
      window.removeEventListener(
        "initiate-call",
        initiateCallHandler as EventListener,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- TIMER ---------------- */

  const startTimer = () => {
    if (globalTimerRef) {
      clearInterval(globalTimerRef);
      globalTimerRef = null;
    }
    globalCallDuration = 0;
    setCallDuration(0);

    globalTimerRef = setInterval(() => {
      globalCallDuration += 1;
      setCallDuration(globalCallDuration);
    }, 1000);
  };

  const stopTimer = () => {
    if (globalTimerRef) {
      clearInterval(globalTimerRef);
      globalTimerRef = null;
    }
    globalCallDuration = 0;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  /* ---------------- CALL ACTIONS ---------------- */

  const makeCall = (): void => {
    if (!dialedNumber.trim()) return;

    setCallStatus("dialing");
    sipService.makeCall(dialedNumber, false);
    playCallingTone();
  };

  const answerCall = (): void => {
    if (incomingCall) {
      sipService.answerIncomingCall(false);
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallStatus("connected");
      startTimer();
      stopRingtone();
      stopCallingTone();
    }
  };

  const declineCall = (): void => {
    sipService.hangup();
    cleanup();
  };

  const hangup = (): void => {
    sipService.hangup();
    cleanup();
  };

  const cleanup = (): void => {
    stopRingtone();
    stopCallingTone();
    const duration = globalCallDuration;
    stopTimer();
    setOpenCallerIncidents(false);
    if (
      wasIncomingCallRef.current &&
      canCreateSentimentRef.current &&
      duration > 0
    ) {
      setCallSummary({
        number: dialedNumberRef.current,
        duration: duration,
        calleeId: dialedNumberRef.current,
      });
      setShowSentimentModal(true);
      return;
    }

    resetCallState();
  };

  const resetCallState = (): void => {
    setCallStatus("idle");
    setDialedNumber("");
    setIncomingCall(null);
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(true);
    setSelectedSentiment(null);
    wasIncomingCallRef.current = false;
    dialedNumberRef.current = "";

    const audioEl = getRemoteAudioElement();
    audioEl.srcObject = null;
    audioEl.volume = 1;
  };

  /* ---------------- DIALPAD ---------------- */

  const handleDialpadPress = (digit: string): void => {
    if (callStatus === "idle" || callStatus === "ended") {
      setDialedNumber((prev) => prev + digit);
    }
  };

  const handleBackspace = (): void => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  /* ---------------- AUDIO CONTROLS ---------------- */

  const toggleMute = (): void => {
    sipService.toggleMute();
    setIsMuted((prev) => !prev);
  };

  const toggleSpeaker = (): void => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);

    const audioEl = getRemoteAudioElement();
    audioEl.volume = newSpeakerState ? 1 : 0;
  };

  /* ---------------- AUDIO ---------------- */

  const playRingtone = useCallback(async (): Promise<void> => {
    if (!ringRef.current) return;
    try {
      console.log("🔔 Playing ringtone...");
      ringRef.current.currentTime = 0;
      await ringRef.current.play();
    } catch (err) {
      console.warn("🔔 Failed to play ringtone:", err);
    }
  }, []);

  const stopRingtone = useCallback((): void => {
    if (!ringRef.current) return;
    console.log("🔔 Stopping ringtone");
    ringRef.current.pause();
    ringRef.current.currentTime = 0;
  }, []);

  /* ---------------- DRAG HANDLERS ---------------- */

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (!dragRef.current) return;

      const rect = dragRef.current.getBoundingClientRect();
      setDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!dragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      const maxX = window.innerWidth - (dragRef.current?.offsetWidth || 350);
      const maxY = window.innerHeight - (dragRef.current?.offsetHeight || 500);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = (): void => {
      setDragging(false);
    };

    if (dragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, dragOffset]);

  const handleSentimentSubmit = (sentiment: any | null): void => {
    if (!sentiment) {
      setShowSentimentModal(false);
      setCallSummary(null);
      return;
    }
    feedbackMutation.mutate();
  };

  const feedbackMutation = useMutation({
    mutationFn: () => {
      return callerFeedbackApi.create({
        callee_id: callSummary!.calleeId,
        call_uuid: uuid(),
        sentiment: selectedSentiment?.key,
        feedback: selectedSentiment?.labelKey,
      });
    },
    onSuccess: () => {
      toast.success(t("softphone.feedbackSubmitted"));
      setShowSentimentModal(false);
      setCallSummary(null);
      resetCallState();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  /* ---------------- RENDER ---------------- */

  if (!showSip) return null;

  const isInCall =
    callStatus === "connected" ||
    callStatus === "dialing" ||
    callStatus === "ringing" ||
    callStatus === "ended";
  const isIncomingCall = callStatus === "incoming";

  return (
    <div
      ref={dragRef}
      style={{
        left: position.x || "50%",
        top: position.y || 80,
        transform: position.x ? "none" : "translateX(-50%)",
      }}
      className="fixed z-[9999] w-[320px] bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200"
    >
      {/* Header - Draggable Area */}
      <div
        onMouseDown={handleMouseDown}
        className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex justify-between items-center cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">
            {t(isEPM940 ? "softphone.cintrix" : "softphone.title")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <GripHorizontal className="w-5 h-5 text-white/70" />
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                sipConnected
                  ? "bg-green-500"
                  : isConnecting || (shouldConnect && !sipConnected)
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
            />
            <span className="text-xs text-gray-600">
              {sipConnected
                ? t("softphone.connected")
                : isConnecting || (shouldConnect && !sipConnected)
                  ? t("softphone.connecting")
                  : t("softphone.disconnected")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!sipConnected && !isConnecting && !shouldConnect ? (
              <button
                onClick={tryConnect}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-3 py-1 rounded-full font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isConnecting
                  ? t("softphone.connecting")
                  : t("softphone.reconnect")}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-3 py-1 rounded-full font-medium transition-colors shadow-sm"
              >
                {t("softphone.disconnect")}
              </button>
            )}

            {canAssignExtensions && (
              <button
                onClick={() => setShowPasswordPrompt(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                title={t("users.manageExtension", {
                  defaultValue: "Manage Extension",
                })}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {auth?.user?.extension && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              Ext. {auth.user.extension}
            </span>
            <span className="text-xs text-gray-400 mx-1">•</span>
            <span className="text-xs text-gray-400">
              {t("users.defaultPassword")}
            </span>
          </div>
        )}
      </div>

      {/* Display Area */}
      <div className="px-4 py-4 bg-gray-50">
        {/* Call Status Display */}
        {isIncomingCall && (
          <div className="text-center mb-4">
            <PhoneIncoming className="w-12 h-12 text-green-500 mx-auto mb-2 animate-bounce" />
            <p className="text-sm text-gray-500">
              {t("softphone.incomingCallFrom")}
            </p>
            <p className="text-2xl font-bold text-gray-900">{dialedNumber}</p>
          </div>
        )}

        {isInCall && (
          <div className="text-center mb-4">
            {callStatus === "ended" ? (
              <PhoneOff className="w-12 h-12 text-red-500 mx-auto mb-2" />
            ) : (
              <PhoneOutgoing className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            )}
            <p className="text-sm text-gray-500 font-medium">
              {callStatus === "ended"
                ? callEndReason || t("softphone.ended", "Call ended")
                : callStatus === "dialing"
                  ? t("softphone.calling")
                  : callStatus === "connected"
                    ? t("softphone.connected")
                    : t("softphone.ringing")}
            </p>
            <p className="text-2xl font-bold text-gray-900">{dialedNumber}</p>
            {callStatus === "connected" && (
              <p className="text-lg text-green-600 font-mono mt-1">
                {formatDuration(callDuration)}
              </p>
            )}
          </div>
        )}

        {/* Number Display (Idle state) */}
        {!isInCall && !isIncomingCall && (
          <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={dialedNumber}
                onChange={(e) => setDialedNumber(e.target.value)}
                placeholder={t("softphone.enterNumber")}
                className="text-2xl font-semibold text-gray-900 w-full outline-none bg-transparent focus:outline-none focus:ring-0 border-none"
              />
              {dialedNumber && (
                <button
                  onClick={handleBackspace}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Delete className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* In-Call Controls */}
        {isInCall && callStatus !== "ended" && (
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                isMuted
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleSpeaker}
              className={`p-3 rounded-full transition-colors ${
                !isSpeakerOn
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      {isIncomingCall && canViewSentiment && user && (
        <SentimentStats calleeId={user.id} callerId={dialedNumber} t={t} />
      )}

      {/* Dialpad */}
      {!isInCall && !isIncomingCall && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {dialpadKeys.map((key) => (
              <button
                key={key.digit}
                onClick={() => handleDialpadPress(key.digit)}
                className="flex flex-col items-center justify-center py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors active:scale-95"
              >
                <span className="text-xl font-semibold text-gray-900">
                  {key.digit}
                </span>
                {key.letters && (
                  <span className="text-[10px] text-gray-500 tracking-wider">
                    {key.letters}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        {/* Incoming Call Actions */}
        {isIncomingCall && (
          <div className="flex gap-3">
            <button
              onClick={declineCall}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              {t("softphone.decline")}
            </button>
            <button
              onClick={answerCall}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
            >
              <Phone className="w-5 h-5" />
              {t("softphone.answer")}
            </button>
          </div>
        )}

        {/* Active Call Actions */}
        {isInCall && callStatus !== "ended" && (
          <button
            onClick={hangup}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            {t("softphone.endCall")}
          </button>
        )}

        {/* Idle State - Call Button */}
        {!isInCall && !isIncomingCall && (
          <button
            onClick={makeCall}
            disabled={!dialedNumber.trim() || !sipConnected}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
              dialedNumber.trim() && sipConnected
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Phone className="w-5 h-5" />
            {t("softphone.call")}
          </button>
        )}
      </div>

      {/* Manage Extension Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t("users.manageExtension", {
                    defaultValue: "Manage Extension",
                  })}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("users.currentExtension", {
                    defaultValue: "Current Extension",
                  })}
                  :{" "}
                  {auth?.user?.extension ||
                    t("common.none", { defaultValue: "None" })}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {t("users.selectExtensionToAssign", {
                defaultValue: "Select an extension to assign to yourself:",
              })}
            </p>
            <select
              value={selectedExtension}
              onChange={(e) => setSelectedExtension(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 mb-6"
              disabled={extensionsLoading}
            >
              <option value="">
                {t("common.select", { defaultValue: "Select..." })}
              </option>
              {auth?.user?.extension &&
                !availableExtensions.some(
                  (e: any) => e.extension === auth?.user?.extension,
                ) && (
                  <option value={auth.user.extension}>
                    {auth.user.extension}
                  </option>
                )}
              {availableExtensions.map((ext: any) => (
                <option key={ext.extension} value={ext.extension}>
                  {ext.extension}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                disabled={assignExtensionMutation.isPending}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  if (selectedExtension) {
                    assignExtensionMutation.mutate({
                      extension: selectedExtension,
                    });
                  }
                }}
                disabled={
                  !selectedExtension || assignExtensionMutation.isPending
                }
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {assignExtensionMutation.isPending
                  ? t("common.saving", { defaultValue: "Saving..." })
                  : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSentimentModal && callSummary && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[300px] overflow-hidden p-4">
            {/* Sentiment header row */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-gray-900">
                  {t("softphone.sentimentTitle")}
                </p>

                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  <span>{callSummary.number}</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(callSummary.duration)}</span>
                </p>
              </div>

              <button
                onClick={() => handleSentimentSubmit(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emoji row */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {SENTIMENTS(t).map((item) => (
                <button
                  key={item?.key}
                  onClick={() => setSelectedSentiment(item)}
                  title={t(item?.label)}
                  className={`text-2xl leading-none p-2 rounded-xl border transition-all duration-150 ${
                    selectedSentiment?.key === item?.key
                      ? "scale-110 bg-blue-50 border-primary opacity-100"
                      : "bg-transparent hover:bg-muted border-transparent "
                  }`}
                >
                  {item?.emoji}
                </button>
              ))}
            </div>

            {/* Selected label */}
            <div
              className={`text-center text-xs font-medium text-blue-600 capitalize h-4 mb-4 transition-opacity duration-200 ${
                selectedSentiment ? "opacity-100" : "opacity-0"
              }`}
            >
              {t(selectedSentiment?.labelKey)}
            </div>

            {/* Submit */}
            <button
              onClick={() => handleSentimentSubmit(selectedSentiment)}
              disabled={!selectedSentiment}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                selectedSentiment
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {t("softphone.submit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
