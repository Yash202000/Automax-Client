import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  fileName?: string;
  onDownload?: () => void;
  className?: string;
}

export function AudioPlayer({ src, fileName, onDownload, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar || isLoading) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const volumeBar = volumeRef.current;
    if (!audio || !volumeBar) return;

    const rect = volumeBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, clickX / rect.width));

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
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement('a');
      link.href = src;
      link.download = fileName || 'audio';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = isMuted ? 0 : volume * 100;

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400", className)}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        onClick={togglePlayPause}
        disabled={isLoading}
        className="h-10 w-10 shrink-0 rounded-full bg-primary/90 hover:bg-primary text-white p-0"
      >
        {isLoading ? (
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
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))] w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="hidden sm:flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={toggleMute}
          className="h-8 w-8 p-0"
        >
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
        className="h-8 w-8 shrink-0 p-0"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default AudioPlayer;
