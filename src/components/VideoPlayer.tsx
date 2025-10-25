import { useRef, useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  alt?: string;
  onDoubleTap?: () => void;
  className?: string;
}

const VideoPlayer = ({ src, alt, onDoubleTap, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showMuteButton, setShowMuteButton] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef(0);

  const handlePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleDoubleTap = () => {
    if (onDoubleTap) {
      onDoubleTap();
    }
  };

  const handleContainerClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    if (timeSinceLastClick < 300) {
      handleDoubleTap();
    } else {
      handlePlay();
    }

    lastClickTimeRef.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      longPressTimeoutRef.current = setTimeout(() => {
        if (playbackRate === 1) {
          if (videoRef.current) {
            videoRef.current.playbackRate = 2;
            setPlaybackRate(2);
          }
        } else {
          if (videoRef.current) {
            videoRef.current.playbackRate = 1;
            setPlaybackRate(1);
          }
        }
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlayPause = () => {
      setIsPlaying(!video.paused);
    };

    video.addEventListener("play", handlePlayPause);
    video.addEventListener("pause", handlePlayPause);

    return () => {
      video.removeEventListener("play", handlePlayPause);
      video.removeEventListener("pause", handlePlayPause);
    };
  }, []);

  useEffect(() => {
    const handleMouseEnter = () => {
      setShowMuteButton(true);
    };

    const handleMouseLeave = () => {
      setShowMuteButton(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full group cursor-pointer ${className}`}
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover"
        muted={true}
        playsInline
      />

      <div className="absolute bottom-2 right-2">
        <button
          onClick={toggleMute}
          className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-white" />
          ) : (
            <Volume2 className="h-5 w-5 text-white" />
          )}
        </button>
      </div>

      {playbackRate === 2 && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
          2x
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
