import { useState } from "react";
import { Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageRendererProps {
  content: string;
  fileUrl?: string | null;
  fileType?: string;
}

const MessageRenderer = ({ content, fileUrl, fileType }: MessageRendererProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const isVoiceMessage = content.includes("[Voice Message");
  const isFile = content.includes("[File:");

  const handlePlayPause = () => {
    if (!audioRef) return;
    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const isImageFile = fileType?.startsWith("image");
  const isVideoFile = fileType?.startsWith("video");
  const isAudioFile = fileType?.startsWith("audio") || fileType === "voice";

  return (
    <div className="space-y-2 w-full">
      <div className="break-words">{content}</div>

      {fileUrl && isVoiceMessage && (
        <div className="bg-background/40 rounded-lg p-3 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-shrink-0"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <audio
            ref={setAudioRef}
            src={fileUrl}
            onEnded={handleAudioEnded}
            className="flex-1 h-6"
          />
          <a
            href={fileUrl}
            download
            className="flex-shrink-0"
            title="Download voice message"
          >
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      )}

      {fileUrl && isImageFile && (
        <div className="rounded-lg overflow-hidden max-w-sm">
          <img
            src={fileUrl}
            alt="Message image"
            className="w-full h-auto object-cover rounded-lg max-h-64"
          />
        </div>
      )}

      {fileUrl && isVideoFile && (
        <div className="rounded-lg overflow-hidden max-w-sm">
          <video
            src={fileUrl}
            controls
            className="w-full h-auto object-cover rounded-lg max-h-64"
          />
        </div>
      )}

      {fileUrl && isFile && !isImageFile && !isVideoFile && !isAudioFile && (
        <div className="bg-background/40 rounded-lg p-3 flex items-center justify-between">
          <div className="flex-1 truncate">
            <p className="text-sm text-muted-foreground truncate">{content}</p>
          </div>
          <a
            href={fileUrl}
            download
            className="flex-shrink-0 ml-2"
          >
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      )}
    </div>
  );
};

export default MessageRenderer;
