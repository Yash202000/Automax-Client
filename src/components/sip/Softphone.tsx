import { useEffect, useRef, useState, useCallback } from "react";
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
  const dragRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [sipConnected, setSipConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [dialedNumber, setDialedNumber] = useState<string>("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callDuration, setCallDuration] = useState<number>(0);

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Call duration timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------------- SIP CONNECTION ---------------- */

  useEffect(() => {
    if (showSip && !sipConnected && !isConnecting) {
      tryConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSip, settings, auth]);

  const tryConnect = (): void => {
    if (sipConnected || isConnecting) return;

    if (settings?.socketURL && settings?.domain) {
      setIsConnecting(true);
      sipService.init({
        username: "1005",
        password: "51234",
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

    window.addEventListener("incoming-call", incomingHandler as EventListener);
    window.addEventListener("sip-registered", registeredHandler);
    window.addEventListener("sip-registration-failed", failedHandler);
    window.addEventListener("call-connected", callConnectedHandler);
    window.addEventListener("call-ended", callEndedHandler);

    return () => {
      window.removeEventListener("incoming-call", incomingHandler as EventListener);
      window.removeEventListener("sip-registered", registeredHandler);
      window.removeEventListener("sip-registration-failed", failedHandler);
      window.removeEventListener("call-connected", callConnectedHandler);
      window.removeEventListener("call-ended", callEndedHandler);
    };
  }, []);

  /* ---------------- TIMER ---------------- */

  const startTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
    stopRingtone();
    stopTimer();
  };

  /* ---------------- DIALPAD ---------------- */

  const handleDialpadPress = (digit: string): void => {
    if (callStatus === "idle" || callStatus === "ended") {
      setDialedNumber((prev) => prev + digit);
    }
    // DTMF tones can be sent here during active call
  };

  const handleBackspace = (): void => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  /* ---------------- AUDIO CONTROLS ---------------- */

  const toggleMute = (): void => {
    setIsMuted((prev) => !prev);
    // sipService.toggleMute(!isMuted);
  };

  const toggleSpeaker = (): void => {
    setIsSpeakerOn((prev) => !prev);
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

      // Constrain to viewport
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
          <span className="font-semibold text-white">Softphone</span>
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
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              sipConnected
                ? "bg-green-500"
                : isConnecting
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-600">
            {sipConnected
              ? "Connected"
              : isConnecting
              ? "Connecting..."
              : "Disconnected"}
          </span>
        </div>
        {!sipConnected && !isConnecting && (
          <button
            onClick={tryConnect}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Display Area */}
      <div className="px-4 py-4 bg-gray-50">
        {/* Call Status Display */}
        {isIncomingCall && (
          <div className="text-center mb-4">
            <PhoneIncoming className="w-12 h-12 text-green-500 mx-auto mb-2 animate-bounce" />
            <p className="text-sm text-gray-500">Incoming call from</p>
            <p className="text-2xl font-bold text-gray-900">{dialedNumber}</p>
          </div>
        )}

        {isInCall && (
          <div className="text-center mb-4">
            <PhoneOutgoing className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {callStatus === "dialing" ? "Calling..." : callStatus === "connected" ? "Connected" : "Ringing..."}
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
                placeholder="Enter number"
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
              className={`p-3 rounded-full transition-colors ${
                isMuted
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleSpeaker}
              className={`p-3 rounded-full transition-colors ${
                !isSpeakerOn
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
              Decline
            </button>
            <button
              onClick={answerCall}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
            >
              <Phone className="w-5 h-5" />
              Answer
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
            End Call
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
            Call
          </button>
        )}
      </div>

      {/* Remote Audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline hidden />
    </div>
  );
}
