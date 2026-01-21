import { useEffect, useRef, useState } from "react";
import sipService from ".././../lib/services/sipService";
import ringtone from "./phone_ring.mp3";

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
  settings: Settings;
  auth: Auth;
  findByID?: (id: string) => User | undefined;
}

/* -------------------- Audio -------------------- */

const ring = new Audio(ringtone);
ring.loop = true;

/* -------------------- Component -------------------- */

export default function SoftPhone({
  showSip,
  settings,
  auth
}: SoftPhoneProps) {
  const dragRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [show, setShow] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [target, setTarget] = useState<string>("");
  const [callMessage, setCallMessage] = useState<string>("");

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);

  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<boolean>(false);

  /* ---------------- WATCHERS ---------------- */

  useEffect(() => {
    setShow(showSip);
  }, [showSip]);

  useEffect(() => {
    tryConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, auth]);

  /* ---------------- SIP EVENTS ---------------- */

  useEffect(() => {
    const incomingHandler = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const session = ce.detail.session;

      setIncomingCall(session);
      setTarget(session?.remote_identity?.uri?.user ?? "");
      setCallMessage("Getting call from");
      playRingtone();
      setShow(true);
    };

    const registeredHandler = () => setConnected(true);
    const failedHandler = () => setConnected(false);

    window.addEventListener("incoming-call", incomingHandler as EventListener);
    window.addEventListener("sip-registered", registeredHandler);
    window.addEventListener("sip-registration-failed", failedHandler);

    return () => {
      window.removeEventListener("incoming-call", incomingHandler as EventListener);
      window.removeEventListener("sip-registered", registeredHandler);
      window.removeEventListener("sip-registration-failed", failedHandler);
    };
  }, []);

  /* ---------------- CONNECT ---------------- */

    const tryConnect = (): void => {
        if (isConnected) return;

        // const user = findByID(auth.user.userID);
        const user: any = {};

        if (
            settings?.socketURL &&
            settings?.domain &&
            auth.accessToken // ✅ ensure token exists
        ) {
            sipService.init({
            username: user?.extension || '1005',
            password: "51234",
            domain: settings.domain,
            socketUrl: settings.socketURL,
            });

            setIsConnected(true);
        }
    };

  /* ---------------- CALL ACTIONS ---------------- */

  const call = (): void => {
    setCallMessage("Dialing...");
    setShow(true);

    if (incomingCall) {
      sipService.answerIncomingCall(false);
      setActiveCall(incomingCall);
      setIncomingCall(null);
    } else {
      sipService.makeCall(target, false);
    }
  };

  const hangup = (): void => {
    sipService.hangup();
    cleanup();
  };

  const cleanup = (): void => {
    setCallMessage("");
    setTarget("");
    setIncomingCall(null);
    setActiveCall(null);
    stopRingtone();
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

  /* ---------------- DRAG ---------------- */

  const onMouseDown = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (!dragRef.current) return;

    setDragging(true);
    setOffset({
      x: e.clientX - dragRef.current.offsetLeft,
      y: e.clientY - dragRef.current.offsetTop
    });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!dragging || !dragRef.current) return;

    dragRef.current.style.left = `${e.clientX - offset.x}px`;
    dragRef.current.style.top = `${e.clientY - offset.y}px`;
  };

  const onMouseUp = (): void => setDragging(false);

  /* ---------------- JSX ---------------- */

  if (!show || !connected) return null;

  return (
    <div
      ref={dragRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[350px] bg-white shadow-xl rounded-xl p-4"
    >
      {/* Top bar */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Micro SIP</span>
        <div className="flex gap-2">
          <button
            onMouseDown={onMouseDown}
            className="cursor-grab text-gray-500"
          >
            ☰
          </button>
          <button onClick={() => setShow(false)}>✕</button>
        </div>
      </div>

      {/* Call card */}
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <span className="text-xs text-gray-500">{callMessage}</span>
        <div className="text-2xl font-semibold">{target}</div>

        <div className="flex gap-3 justify-center mt-4">
          {(!activeCall || incomingCall) && (
            <button
              onClick={call}
              className="bg-green-500 text-white px-4 py-2 rounded-full"
            >
              📞
            </button>
          )}

          {(activeCall || incomingCall) && (
            <button
              onClick={hangup}
              className="bg-red-500 text-white px-4 py-2 rounded-full"
            >
              ❌
            </button>
          )}
        </div>
      </div>

      {/* Remote Audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline hidden />
    </div>
  );
}
