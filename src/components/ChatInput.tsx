import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Smile, Mic, Send, Square } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSendMessage: (content: string, fileUrl?: string | null, fileType?: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const ChatInput = ({ onSendMessage, isLoading = false, placeholder = "Type a message..." }: ChatInputProps) => {
  const [messageInput, setMessageInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
      }
    };

    if (showEmoji) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmoji]);

  const handleEmojiClick = (emojiObject: { emoji: string }) => {
    setMessageInput((prev) => prev + emojiObject.emoji);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    try {
      setUploadingFile(true);
      const fileName = `voice-${crypto.randomUUID()}.webm`;
      const filePath = `voice-messages/${fileName}`;

      const { error: uploadError, data } = await supabase.storage.from("posts").upload(filePath, audioBlob, {
        cacheControl: "3600",
        contentType: "audio/webm",
      });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        onSendMessage("🎤 [Voice Message Sent]");
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("posts").getPublicUrl(filePath);
      onSendMessage("🎤 [Voice Message Sent]", publicUrlData.publicUrl, "voice");
    } catch (error) {
      console.error("Voice upload error:", error);
      onSendMessage("🎤 [Voice Message Sent]");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingFile(true);
      const fileName = `${crypto.randomUUID()}-${file.name}`;
      const filePath = `chat-files/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("posts").upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
      });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        onSendMessage(`📎 [File: ${file.name}]`);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("posts").getPublicUrl(filePath);
      onSendMessage(`📎 [File: ${file.name}]`, publicUrlData.publicUrl, file.type);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("File upload error:", error);
      onSendMessage(`📎 [File sent]`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isLoading || uploadingFile) return;
    onSendMessage(messageInput.trim());
    setMessageInput("");
  };

  return (
    <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
      <div className="flex gap-2 items-end">
        <Input
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder={placeholder}
          className="bg-background/80 text-white flex-1"
          disabled={isLoading || uploadingFile || isRecording}
        />

        <div className="relative" ref={emojiPickerRef}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowEmoji(!showEmoji)}
            disabled={isLoading || uploadingFile || isRecording}
          >
            <Smile className="h-5 w-5" />
          </Button>
          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <EmojiPicker onEmojiClick={handleEmojiClick} height={300} width={300} />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isLoading || uploadingFile || isRecording}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || uploadingFile || isRecording}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {isRecording ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={stopRecording}
            className="animate-pulse"
          >
            <Square className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={startRecording}
            disabled={isLoading || uploadingFile}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}

        <Button
          type="submit"
          variant="gradient"
          className="min-w-[100px]"
          disabled={!messageInput.trim() || isLoading || uploadingFile || isRecording}
        >
          {isRecording ? "Recording..." : uploadingFile ? "Uploading..." : "Send"}
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;
