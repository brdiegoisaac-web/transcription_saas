import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, SkipBack, SkipForward } from "lucide-react";

interface AudioPlayerProps {
  src?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export default function AudioPlayer({
  src,
  onTimeUpdate,
  onDurationChange,
  onPlay,
  onPause,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Atualizar tempo atual
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      }
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
      onDurationChange?.(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isDragging, onTimeUpdate, onDurationChange, onPlay, onPause]);

  // Sincronizar volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseDown = () => {
    setIsDragging(true);
  };

  const handleProgressMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (!progressBarRef.current || !audioRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(percent * duration, duration));

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressTouchStart = () => {
    setIsDragging(true);
  };

  const handleProgressTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (!progressBarRef.current || !audioRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const percent = (touch.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(percent * duration, duration));

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !progressBarRef.current || !audioRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const percent = (touch.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(percent * duration, duration));

    setCurrentTime(newTime);
  };

  const skipForward = (seconds: number = 10) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + seconds, duration);
    }
  };

  const skipBackward = (seconds: number = 10) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - seconds, 0);
    }
  };

  return (
    <div className="w-full bg-blue-50/30 border-b border-blue-100 rounded-lg p-4 sm:p-6">
      <audio ref={audioRef} src={src} crossOrigin="anonymous" />

      {/* Barra de Progresso */}
      <div className="mb-4">
        <div
          ref={progressBarRef}
          className="w-full h-2 bg-gray-200 rounded-full cursor-pointer group relative"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
          onMouseUp={handleProgressMouseUp}
          onTouchStart={handleProgressTouchStart}
          onTouchEnd={handleProgressTouchEnd}
          onTouchMove={handleProgressTouchMove}
        >
          {/* Barra preenchida */}
          <div
            className="h-full bg-blue-900 rounded-full transition-all"
            style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
            }}
          />

          {/* Thumb (bolinha) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-900 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `${duration ? (currentTime / duration) * 100 : 0}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        {/* Tempo */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span className="font-medium">{formatTime(currentTime)}</span>
          <span className="font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Skip Backward */}
          <button
            onClick={() => skipBackward(10)}
            className="p-2 hover:bg-white rounded-lg transition-colors text-blue-900"
            title="Voltar 10s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="p-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
            title={isPlaying ? "Pausar" : "Reproduzir"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => skipForward(10)}
            className="p-2 hover:bg-white rounded-lg transition-colors text-blue-900"
            title="Avançar 10s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-900" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-900"
          />
        </div>
      </div>
    </div>
  );
}
