// src/services/sipService.ts
import JsSIP from "jssip";

/* -------------------- Types -------------------- */

export interface SipConfig {
  username: string;
  password: string;
  domain: string;
  socketUrl: string;
  auth?: {
    accessToken: string;
  };
}

type SipEventName =
  | "sip-registered"
  | "sip-registration-failed"
  | "new-call"
  | "incoming-call"
  | "remote-stream"
  | "local-stream"
  | "call-connected"
  | "call-ended"
  | "permissions-blocked"
  | "permissions-missing"
  | "myStatusChange";

/* -------------------- State -------------------- */

let ua: JsSIP.UA | null = null;
let session: any = null;
let localStream: MediaStream | null = null;
let remoteStreamDispatched = false;
let callAccepted = false;
let pendingRemoteStream: MediaStream | null = null;

/* -------------------- RTC Config -------------------- */

const pcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/* -------------------- Utils -------------------- */

const dispatch = <T = unknown>(name: SipEventName, detail?: T): void => {
  window.dispatchEvent(new CustomEvent<T>(name, { detail }));
};

/* -------------------- Service -------------------- */

const sipService = {
  init(config: SipConfig): void {
    if (ua) return;

    const socket = new JsSIP.WebSocketInterface(config.socketUrl);

    ua = new JsSIP.UA({
      sockets: [socket],
      uri: `sip:${config.username}@${config.domain}`,
      password: config.password,
      pcConfig,
    } as any);

    ua.on("registered", () => {
      dispatch("sip-registered");
    });

    ua.on("registrationFailed", (e: any) => {
      dispatch("sip-registration-failed", e.cause);
    });

    ua.on("disconnected", () => {});

    ua.on("newRTCSession", (e: any) => {
      session = e.session;

      dispatch("new-call", {
        session,
        originator: e.originator,
      });

      if (e.originator === "remote") {
        const hasVideo =
          typeof e.request?.body === "string" &&
          e.request.body.includes("m=video");

        dispatch("incoming-call", { session, hasVideo });
      }

      session.on("peerconnection", ({ peerconnection }: any) => {
        peerconnection.ontrack = (event: RTCTrackEvent) => {
          if (remoteStreamDispatched) return;

          let streamToUse: MediaStream | null = null;

          if (event.streams && event.streams[0]) {
            streamToUse = event.streams[0];
          } else {
            streamToUse = new MediaStream([event.track]);
          }

          if (streamToUse) {
            if (callAccepted) {
              remoteStreamDispatched = true;
              dispatch("remote-stream", streamToUse);
            } else {
              pendingRemoteStream = streamToUse;
            }
          }
        };
      });

      const connection = session.connection;
      if (connection) {
        connection.ontrack = (event: RTCTrackEvent) => {
          if (event.streams && event.streams[0]) {
            if (callAccepted && !remoteStreamDispatched) {
              remoteStreamDispatched = true;
              dispatch("remote-stream", event.streams[0]);
            } else if (!callAccepted) {
              pendingRemoteStream = event.streams[0];
            }
          }
        };
      }

      session.on("progress", () => {
        console.log("📞 Ringing...");
      });

      session.on("confirmed", () => {
        console.log("✅ Call connected (real answer)");
        callAccepted = true;
        dispatch("call-connected");

        if (pendingRemoteStream && !remoteStreamDispatched) {
          remoteStreamDispatched = true;
          dispatch("remote-stream", pendingRemoteStream);
          pendingRemoteStream = null;
        }

        if (!remoteStreamDispatched) {
          const conn = session.connection;
          if (conn) {
            const receivers = conn.getReceivers();

            if (receivers.length > 0) {
              const remoteStream = new MediaStream();
              receivers.forEach((receiver: RTCRtpReceiver) => {
                if (receiver.track) {
                  remoteStream.addTrack(receiver.track);
                }
              });
              if (remoteStream.getTracks().length > 0) {
                remoteStreamDispatched = true;
                dispatch("remote-stream", remoteStream);
              }
            }
          }
        }
      });

      session.on("ended", () => {
        cleanup();
      });

      session.on("failed", () => {
        cleanup();
      });
    });

    ua.start();
  },

  async requestPermissions(withVideo: boolean): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo,
      });

      localStream = stream;
      return stream;
    } catch (err: any) {
      const type =
        err.name === "NotAllowedError"
          ? "permissions-blocked"
          : "permissions-missing";

      dispatch(type, withVideo ? "camera+microphone" : "microphone");
      return null;
    }
  },

  async makeCall(target: string, withVideo: boolean): Promise<void> {
    if (!ua) return;

    const stream = await this.requestPermissions(withVideo);
    if (!stream) return;

    dispatch("local-stream", stream);

    session = ua.call(target, {
      mediaStream: stream,
      pcConfig,
    });
  },

  async answerIncomingCall(withVideo: boolean): Promise<void> {
    if (!session) return;

    const stream = await this.requestPermissions(withVideo);
    if (!stream) return;

    dispatch("local-stream", stream);

    session.answer({
      mediaStream: stream,
      pcConfig,
    });
  },

  hangup(): void {
    if (session) {
      session.terminate();
      cleanup();
    }
  },

  toggleMute(): void {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  },

  toggleVideo(): void {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  },

  getSession(): any {
    return session;
  },
};

/* -------------------- Cleanup -------------------- */

function cleanup(): void {
  session = null;
  remoteStreamDispatched = false;
  callAccepted = false;
  pendingRemoteStream = null;
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  dispatch("call-ended");
}

/* -------------------- Optional API -------------------- */

export async function updateUserStatus(
  status: string,
  config: SipConfig,
): Promise<void> {
  try {
    if (!config.auth) return;

    const res = await fetch(
      `${(window as any).CortezaAPI}/system/users/${config.username}/status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ call_status: status }),
      },
    );

    const data = await res.json();
    dispatch("myStatusChange", data?.response?.data?.call_status);
  } catch {
    // Status update failed silently
  }
}

export default sipService;
