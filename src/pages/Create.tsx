import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, MapPin, UploadCloud, Film, Zap, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MentionableTextarea from "@/components/MentionableTextarea";
import { extractMentions, saveMentions } from "@/utils/mentions";
import { extractHashtags, saveHashtags } from "@/utils/hashtag";

type ContentType = "post" | "reel" | "story" | null;

const Create = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contentType, setContentType] = useState<ContentType>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];

    if (contentType === "post") {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Unsupported file",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
    } else if (contentType === "reel" || contentType === "story") {
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Unsupported file",
          description: "Please select a video file.",
          variant: "destructive",
        });
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !contentType) return;

    if (!selectedFile) {
      const fileType = contentType === "post" ? "image" : "video";
      toast({
        title: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} required`,
        description: `Please upload a ${fileType} for your ${contentType}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const bucket = "posts";
      const contentFolder = contentType === "post" ? "images" : "videos";
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() ?? (contentType === "post" ? "jpg" : "mp4");
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${contentFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          caption: caption.trim() || null,
          location: location.trim() || null,
          is_public: isPublic,
        })
        .select("id")
        .single();

      if (postError || !postData) {
        throw postError ?? new Error(`${contentType} creation failed`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      const mediaType = contentType === "post" ? "image" : "video";
      const { error: mediaError } = await supabase
        .from("media")
        .insert({
          post_id: postData.id,
          url: publicUrl,
          type: mediaType,
          display_order: 0,
        });

      if (mediaError) {
        throw mediaError;
      }

      const mentions = extractMentions(caption);
      if (mentions.length > 0) {
        await saveMentions(postData.id, null, mentions, user.id);
      }

      const hashtags = extractHashtags(caption);
      if (hashtags.length > 0) {
        await saveHashtags(postData.id, hashtags);
      }

      const typeLabel = contentType === "post" ? "Post" : contentType === "reel" ? "Reel" : "Story";
      toast({
        title: `${typeLabel} created`,
        description: "Your content has been shared successfully.",
      });

      setCaption("");
      setLocation("");
      setSelectedFile(null);
      setContentType(null);
      setIsPublic(true);
      navigate("/feed");
    } catch (error) {
      console.error("Error creating post", error);
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Unable to create post.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-3xl">
                    <ImagePlus className="h-7 w-7 text-primary" />
                    Create content
                  </CardTitle>
                  <CardDescription>
                    Choose what you want to share with your followers
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/drafts")}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Drafts
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!contentType ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setContentType("post")}
                    className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <ImagePlus className="mb-3 h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="font-semibold">Post</span>
                    <span className="text-xs text-muted-foreground">Upload an image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentType("reel")}
                    className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <Film className="mb-3 h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="font-semibold">Reel</span>
                    <span className="text-xs text-muted-foreground">Upload a video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContentType("story")}
                    className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <Zap className="mb-3 h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="font-semibold">Story</span>
                    <span className="text-xs text-muted-foreground">Quick video post</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setContentType(null);
                      setSelectedFile(null);
                      setCaption("");
                      setLocation("");
                    }}
                    className="mb-6 text-sm text-primary hover:underline"
                  >
                    ← Back to content type selection
                  </button>
                  <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-muted-foreground">Caption</Label>
                    <MentionableTextarea
                      placeholder="Write something about this moment... (use @ to mention users)"
                      value={caption}
                      onChange={setCaption}
                      maxLength={2200}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Keep it friendly and descriptive. Use @ to mention users.</span>
                      <span>{caption.length}/2200</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Add a location"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">Public visibility</div>
                        <div className="text-xs text-muted-foreground">
                          Share with everyone when enabled. Disable to keep it private.
                        </div>
                      </div>
                      <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>
                    Upload {contentType === "post" ? "image" : "video"}
                  </Label>
                  <div className="flex flex-col gap-4 rounded-3xl border border-dashed border-border p-6 text-center">
                    {previewUrl ? (
                      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-muted">
                        {contentType === "post" ? (
                          <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <video src={previewUrl} className="h-full w-full object-cover" controls />
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <UploadCloud className="h-10 w-10" />
                        <p className="text-sm">Drag and drop or click to upload</p>
                        <p className="text-xs">
                          {contentType === "post" 
                            ? "JPEG, PNG, WEBP up to 10MB" 
                            : "MP4, WebM, MOV up to 100MB"}
                        </p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept={contentType === "post" ? "image/*" : "video/*"}
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Publishing..." : "Publish"}
                  </Button>
                </div>
              </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Create;
