import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface StoryCreatorProps {
  onStoryCreated?: () => void;
}

const StoryCreator = ({ onStoryCreated }: StoryCreatorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image or video file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;

    setIsUploading(true);
    try {
      const fileExtension = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;

      const { data, error } = await supabase.storage
        .from("posts")
        .upload(fileName, selectedFile);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(fileName);

      const mediaType = selectedFile.type.startsWith("video/") ? "video" : "image";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const { error: storyError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
        expires_at: expiresAt.toISOString(),
      });

      if (storyError) throw storyError;

      toast({
        title: "Story posted",
        description: "Your story will disappear in 24 hours.",
      });

      setIsOpen(false);
      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      onStoryCreated?.();
    } catch (error) {
      console.error("Error uploading story:", error);
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Story
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a story</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {preview ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                {selectedFile?.type.startsWith("video/") ? (
                  <video
                    src={preview}
                    className="h-full w-full object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Story preview"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square w-full cursor-pointer rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
              >
                <div className="text-center">
                  <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to add media</p>
                  <p className="text-xs text-muted-foreground">Image or video</p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Textarea
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              disabled={isUploading}
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedFile(null);
                  setPreview(null);
                  setCaption("");
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? "Uploading..." : "Post story"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoryCreator;
