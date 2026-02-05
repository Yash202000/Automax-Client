import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import sipService from "../../lib/services/sipService";
import ringtone from "./phone_ring.mp3";
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
} from "lucide-react";

/* -------------------- Types -------------------- */

interface User {
  userID: string;
  extension?: string;
}

interface Auth {
  user?: User;
  accessToken?: string;
}

interface Settings {
  socketURL?: string;
  domain?: string;
}

interface SoftPhoneProps {
  showSip: boolean;
  onClose?: () => void;
  settings: Settings;
  auth: Auth;
  findByID?: (id: string) => User | undefined;
}

type CallStatus = "idle" | "dialing" | "ringing" | "incoming" | "connected" | "ended";

/* -------------------- Audio -------------------- */

const ring = new Audio(ringtone);
ring.loop = true;

// Create a persistent audio element for remote stream (singleton)
let remoteAudioElement: HTMLAudioElement | null = null;
const getRemoteAudioElement = (): HTMLAudioElement => {
  if (!remoteAudioElement) {
    remoteAudioElement = document.createElement('audio');
    remoteAudioElement.autoplay = true;
    remoteAudioElement.id = 'softphone-remote-audio';
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

/* -------------------- Component -------------------- */

export default function SoftPhone({
  showSip,
  onClose,
  settings,
  auth,
}: SoftPhoneProps) {
  const { t } = useTranslation();
  const dragRef = useRef<HTMLDivElement | null>(null);

  const [sipConnected, setSipConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [dialedNumber, setDialedNumber] = useState<string>("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callDuration, setCallDuration] = useState<number>(0);

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [_activeCall, setActiveCall] = useState<any>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Extension credentials
  const [sipPassword, setSipPassword] = useState<string>("51234");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);

  /* ---------------- SIP CONNECTION ---------------- */

  // Initialize persistent audio element on mount
  useEffect(() => {
    getRemoteAudioElement();
  }, []);

  useEffect(() => {
    if (showSip && !sipConnected && !isConnecting) {
      tryConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSip, settings]);

  const tryConnect = (): void => {
    if (sipConnected || isConnecting) return;

    const extension = auth?.user?.extension;

    if (!extension) {
      alert('No extension configured for your account. Please contact your administrator to set up your extension.');
      if (onClose) onClose();
      return;
    }

    // Use default password "51234" if not set
    const password = sipPassword || "51234";

    if (settings?.socketURL && settings?.domain) {
      setIsConnecting(true);
      sipService.init({
        username: extension,
        password: password,
        domain: settings.domain,
        socketUrl: settings.socketURL,
      });
    }
  };

  /* ---------------- SIP EVENTS ---------------- */

  useEffect(() => {
    const incomingHandler = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const session = ce.detail.session;

      setIncomingCall(session);
      setDialedNumber(session?.remote_identity?.uri?.user ?? "Unknown");
      setCallStatus("incoming");
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
      stopRingtone();
      startTimer();
    };

    const callEndedHandler = () => {
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
        audioEl.play().catch(() => { });
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
    window.addEventListener("call-ended", callEndedHandler);
    window.addEventListener("remote-stream", remoteStreamHandler as EventListener);
    window.addEventListener("initiate-call", initiateCallHandler as EventListener);

    return () => {
      window.removeEventListener("incoming-call", incomingHandler as EventListener);
      window.removeEventListener("sip-registered", registeredHandler);
      window.removeEventListener("sip-registration-failed", failedHandler);
      window.removeEventListener("call-connected", callConnectedHandler);
      window.removeEventListener("call-ended", callEndedHandler);
      window.removeEventListener("remote-stream", remoteStreamHandler as EventListener);
      window.removeEventListener("initiate-call", initiateCallHandler as EventListener);
    };
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
  };

  const answerCall = (): void => {
    if (incomingCall) {
      sipService.answerIncomingCall(false);
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallStatus("connected");
      stopRingtone();
      startTimer();
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
    setCallStatus("idle");
    setDialedNumber("");
    setIncomingCall(null);
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(true);
    stopRingtone();
    stopTimer();

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

  const playRingtone = async (): Promise<void> => {
    try {
      ring.currentTime = 0;
      await ring.play();
    } catch {
      // autoplay may be blocked
    }
  };

  const stopRingtone = (): void => {
    ring.pause();
    ring.currentTime = 0;
  };

  /* ---------------- DRAG HANDLERS ---------------- */

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    if (!dragRef.current) return;

    const rect = dragRef.current.getBoundingClientRect();
    setDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

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

  /* ---------------- RENDER ---------------- */

  if (!showSip) return null;

  const isInCall = callStatus === "connected" || callStatus === "dialing" || callStatus === "ringing";
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
          <span className="font-semibold text-white">{t('softphone.title')}</span>
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
              className={`w-2 h-2 rounded-full ${sipConnected
                  ? "bg-green-500"
                  : isConnecting
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
            />
            <span className="text-xs text-gray-600">
              {sipConnected
                ? t('softphone.connected')
                : isConnecting
                  ? t('softphone.connecting')
                  : t('softphone.disconnected')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPasswordPrompt(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="Change SIP Password"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {!sipConnected && !isConnecting && (
              <button
                onClick={tryConnect}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('softphone.reconnect')}
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
              Default password
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
            <p className="text-sm text-gray-500">{t('softphone.incomingCallFrom')}</p>
            <p className="text-2xl font-bold text-gray-900">{dialedNumber}</p>
          </div>
        )}

        {isInCall && (
          <div className="text-center mb-4">
            <PhoneOutgoing className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {callStatus === "dialing" ? t('softphone.calling') : callStatus === "connected" ? t('softphone.connected') : t('softphone.ringing')}
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
                placeholder={t('softphone.enterNumber')}
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
        {isInCall && (
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${isMuted
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleSpeaker}
              className={`p-3 rounded-full transition-colors ${!isSpeakerOn
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

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
                <span className="text-xl font-semibold text-gray-900">{key.digit}</span>
                {key.letters && (
                  <span className="text-[10px] text-gray-500 tracking-wider">{key.letters}</span>
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
              {t('softphone.decline')}
            </button>
            <button
              onClick={answerCall}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
            >
              <Phone className="w-5 h-5" />
              {t('softphone.answer')}
            </button>
          </div>
        )}

        {/* Active Call Actions */}
        {isInCall && (
          <button
            onClick={hangup}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            {t('softphone.endCall')}
          </button>
        )}

        {/* Idle State - Call Button */}
        {!isInCall && !isIncomingCall && (
          <button
            onClick={makeCall}
            disabled={!dialedNumber.trim() || !sipConnected}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${dialedNumber.trim() && sipConnected
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            <Phone className="w-5 h-5" />
            {t('softphone.call')}
          </button>
        )}
      </div>

      {/* SIP Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">SIP Password Settings</h3>
                <p className="text-sm text-gray-500">Extension: {auth?.user?.extension}</p>
              </div>
            </div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">Default Password</p>
              <p className="text-sm text-blue-700">
                Using default password: <span className="font-mono font-bold">51234</span>
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Enter a custom SIP password or leave as default:
            </p>
            <input
              type="password"
              value={sipPassword}
              onChange={(e) => setSipPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setShowPasswordPrompt(false);
                }
              }}
              placeholder="51234 (default)"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  if (!sipConnected) {
                    tryConnect();
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-colors shadow-md hover:shadow-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
