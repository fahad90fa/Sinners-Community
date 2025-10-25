import { useState } from "react";
import { Play, Pause, Download, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageRendererProps {
  content: string;
  fileUrl?: string | null;
  fileType?: string;
}

const MessageRenderer = ({ content, fileUrl, fileType }: MessageRendererProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const getFileNameFromContent = (text: string): string => {
    const match = text.match(/\[(?:Voice Message|File): (.+?)\]/);
    return match ? match[1] : "Download file";
  };

  const isImageFile = fileType?.startsWith("image") || 
    /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(fileUrl || "");
  const isVideoFile = fileType?.startsWith("video") || 
    /\.(mp4|webm|ogg|mov|avi|mkv|flv)$/i.test(fileUrl || "");
  const isAudioFile = fileType?.startsWith("audio") || fileType === "voice" ||
    /\.(mp3|wav|ogg|aac|m4a|flac|webm)$/i.test(fileUrl || "");
  const isVoiceMessage = content.includes("[Voice Message");

  const handlePlayPause = async () => {
    if (!audioRef) return;
    try {
      if (isPlaying) {
        audioRef.pause();
        setIsPlaying(false);
      } else {
        await audioRef.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Audio playback error:", error);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const extractFileName = (): string => {
    if (isVoiceMessage) return "Voice Message";
    const match = content.match(/\[File: (.+?)\]/);
    return match ? match[1] : "File";
  };

  return (
    <div className="space-y-2 w-full">
      {!isImageFile && !isVideoFile && !isAudioFile && (
        <div className="break-words">{content}</div>
      )}

      {fileUrl && isImageFile && (
        <div className="rounded-lg overflow-hidden max-w-sm">
          <img
            src={fileUrl}
            alt={extractFileName()}
            className="w-full h-auto object-cover rounded-lg max-h-80"
          />
        </div>
      )}

      {fileUrl && isVideoFile && (
        <div className="rounded-lg overflow-hidden max-w-sm">
          <video
            src={fileUrl}
            controls
            className="w-full h-auto object-cover rounded-lg max-h-80"
          />
        </div>
      )}

      {fileUrl && isAudioFile && (
        <div className="bg-background/40 rounded-lg p-3 flex items-center gap-3 max-w-sm">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-shrink-0"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1">
            <audio
              ref={setAudioRef}
              src={fileUrl}
              onEnded={handleAudioEnded}
              className="w-full h-6"
            />
            <p className="text-xs text-muted-foreground mt-1">{extractFileName()}</p>
          </div>
          <a
            href={fileUrl}
            download
            className="flex-shrink-0"
            title="Download audio"
          >
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      )}

      {fileUrl && !isImageFile && !isVideoFile && !isAudioFile && (
        <div className="bg-background/40 rounded-lg p-3 flex items-center gap-3 max-w-sm">
          <File className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 truncate">
            <p className="text-sm truncate">{extractFileName()}</p>
          </div>
          <a
            href={fileUrl}
            download
            className="flex-shrink-0"
            title="Download file"
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
