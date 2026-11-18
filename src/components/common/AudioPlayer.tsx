import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/utils/apiError";

export type AudioAccessActivity = "listened" | "downloaded";

export interface AudioAccessGrant {
  url: string;
  expires_at?: string;
}

interface AudioPlayerProps {
  /** Static source. Used when `getSrc` is not provided. */
  src?: string;
  /**
   * Opt-in audited mode. When set, the audio has no source until the user
   * presses Play; every new listen and every download first calls
   * `getSrc(activity)` for a short-lived URL. If that call fails nothing
   * plays or downloads and the error is shown as a toast.
   */
  getSrc?: (activity: AudioAccessActivity) => Promise<AudioAccessGrant>;
  fileName?: string;
  onDownload?: () => void;
  className?: string;
}

// Fallback lifetime when the server omits/garbles expires_at (server grants are 10 min).
const DEFAULT_GRANT_TTL_MS = 9 * 60 * 1000;
// Treat a grant this close to expiry as already expired.
const GRANT_EXPIRY_MARGIN_MS = 5 * 1000;

const parseExpiry = (expiresAt?: string) => {
  const ts = expiresAt ? Date.parse(expiresAt) : NaN;
  return Number.isFinite(ts) ? ts : Date.now() + DEFAULT_GRANT_TTL_MS;
};

const triggerDownload = (href: string, fileName?: string) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName || "audio";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const isRtlElement = (el: HTMLElement) =>
  getComputedStyle(el).direction === "rtl";

export function AudioPlayer({
  src,
  getSrc,
  fileName,
  onDownload,
  className,
}: AudioPlayerProps) {
  const { t } = useTranslation();
  const gated = !!getSrc;
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  // Active grant for the current listen (gated mode only). Cleared when the
  // clip ends or the stream fails, so the next Play is a new audited listen.
  const grantRef = useRef<{ url: string; expiresAt: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  // Static mode preloads metadata, so it starts loading; gated mode has no
  // source yet and must leave Play enabled.
  const [isLoading, setIsLoading] = useState(!gated);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // One audit entry per listen: replaying after the end needs a new grant.
      grantRef.current = null;
    };

    const handleError = () => {
      if (gated) {
        // No source requested yet: nothing to report.
        if (!grantRef.current) return;
        // Typically an expired/invalid grant while seeking or buffering.
        // Drop it so the next Play requests a fresh one, and stay usable.
        grantRef.current = null;
        setIsPlaying(false);
        setIsLoading(false);
        toast.error(t("common.failedToLoadAudio"));
        return;
      }
      setError(t("common.failedToLoadAudio"));
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [t, gated]);

  const hasValidGrant = () => {
    const grant = grantRef.current;
    return !!grant && grant.expiresAt - GRANT_EXPIRY_MARGIN_MS > Date.now();
  };

  const startGatedPlayback = async (audio: HTMLAudioElement) => {
    // Resume within the same listen: no new audit entry.
    if (hasValidGrant()) {
      await audio.play().catch(() => {
        toast.error(t("common.failedToLoadAudio"));
      });
      return;
    }

    setIsRequesting(true);
    try {
      let grant: AudioAccessGrant;
      try {
        grant = await getSrc!("listened");
      } catch (err) {
        // The audit entry could not be saved (or access was denied):
        // the recording must not play.
        toast.error(
          getApiErrorMessage(err, t("callCentre.recording.accessFailed")),
        );
        return;
      }

      // Re-requesting after expiry mid-listen: continue where we were.
      const resumeAt =
        audio.currentTime > 0 && !audio.ended ? audio.currentTime : 0;
      grantRef.current = {
        url: grant.url,
        expiresAt: parseExpiry(grant.expires_at),
      };
      audio.src = grant.url;
      if (resumeAt > 0) {
        audio.addEventListener(
          "loadedmetadata",
          () => {
            audio.currentTime = resumeAt;
          },
          { once: true },
        );
      }
      await audio.play().catch(() => {
        toast.error(t("common.failedToLoadAudio"));
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || error || isRequesting) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (gated) {
      void startGatedPlayback(audio);
    } else {
      audio.play().catch(() => {
        /* surfaced via the media "error" event */
      });
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar || isLoading || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const offset = isRtlElement(progressBar)
      ? rect.right - e.clientX
      : e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offset / rect.width));
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const volumeBar = volumeRef.current;
    if (!audio || !volumeBar) return;

    const rect = volumeBar.getBoundingClientRect();
    const offset = isRtlElement(volumeBar)
      ? rect.right - e.clientX
      : e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, offset / rect.width));

    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!gated) {
      if (src) triggerDownload(src, fileName);
      return;
    }
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      // A fresh audited grant for every download press.
      const grant = await getSrc!("downloaded");
      triggerDownload(grant.url, fileName);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("callCentre.recording.downloadFailed")),
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = isMuted ? 0 : volume * 100;
  const playBusy = isRequesting || (!gated && isLoading);

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400",
          className,
        )}
      >
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg",
        className,
      )}
    >
      {gated ? (
        // Source is assigned imperatively after an audited access request.
        <audio ref={audioRef} preload="none" />
      ) : (
        <audio ref={audioRef} src={src} preload="metadata" />
      )}

      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        onClick={togglePlayPause}
        disabled={playBusy}
        aria-busy={playBusy}
        className="h-10 w-10 shrink-0 rounded-full bg-primary/90 hover:bg-primary text-white p-0"
      >
        {playBusy ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      {/* Progress Section */}
      <div className="flex-1 flex flex-col gap-1">
        {fileName && (
          <span className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
            {fileName}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] w-10">
            {formatTime(currentTime)}
          </span>
          {/* Progress Bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className={cn(
              "flex-1 h-2 bg-[hsl(var(--border))] rounded-full cursor-pointer relative overflow-hidden",
              (isLoading || !duration) && "opacity-50 cursor-not-allowed",
            )}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))] w-10">
            {gated && !duration ? "--:--" : formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="hidden sm:flex items-center gap-1">
        <Button variant="ghost" onClick={toggleMute} className="h-8 w-8 p-0">
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        {/* Volume Bar */}
        <div
          ref={volumeRef}
          onClick={handleVolumeClick}
          className="w-16 h-2 bg-[hsl(var(--border))] rounded-full cursor-pointer relative overflow-hidden"
        >
          <div
            className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-100"
            style={{ width: `${volumePercentage}%` }}
          />
        </div>
      </div>

      {/* Download Button */}
      <Button
        variant="ghost"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-busy={isDownloading}
        className="h-8 w-8 shrink-0 p-0"
        title={t("common.download")}
      >
        {isDownloading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default AudioPlayer;
