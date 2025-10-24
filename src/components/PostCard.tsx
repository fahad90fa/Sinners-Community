import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Share2, Pencil, Trash2, LinkIcon, MessageCircleMore, Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractHashtags } from "@/utils/hashtag";
import { extractMentions, saveMentions } from "@/utils/mentions";

interface PostCardProps {
  postId: string;
  username: string;
  userAvatar?: string | null;
  imageUrl: string;
  caption: string;
  initialLikes: number;
  commentsCount: number;
  timeAgo: string;
  createdAt: string;
  initialLiked: boolean;
  isOwner?: boolean;
  onPostDeleted?: (postId: string) => void;
  postLink?: string;
  mediaType?: "image" | "video";
}

interface CommentAuthor {
  username: string;
  avatar_url: string | null;
}

interface CommentItem {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  author: CommentAuthor;
}

const PostCard = ({
  postId,
  username,
  userAvatar,
  imageUrl,
  caption,
  initialLikes,
  commentsCount,
  timeAgo,
  createdAt,
  initialLiked,
  isOwner = false,
  onPostDeleted,
  postLink,
  mediaType = "image",
}: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localCaption, setLocalCaption] = useState(caption);
  const [commentsCountState, setCommentsCountState] = useState(commentsCount);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCaption, setEditCaption] = useState(caption);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCheckingSaved, setIsCheckingSaved] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const hashtags = useMemo(() => extractHashtags(localCaption || ""), [localCaption]);

  const permalink = useMemo(() => {
    if (postLink) return postLink;
    if (typeof window === "undefined") return `/posts/${postId}`;
    return `${window.location.origin}/posts/${postId}`;
  }, [postId, postLink]);

  const getRelativeTime = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  useEffect(() => {
    setLikesCount(initialLikes);
  }, [initialLikes, postId]);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked, postId]);

  useEffect(() => {
    setLocalCaption(caption);
    setEditCaption(caption);
  }, [caption, postId]);

  useEffect(() => {
    setCommentsCountState(commentsCount);
  }, [commentsCount, postId]);

  const checkIfSaved = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (error) throw error;
      setIsSaved(!!data && data.length > 0);
    } catch (error) {
      console.error("Error checking saved status:", error);
    } finally {
      setIsCheckingSaved(false);
    }
  }, [user, postId]);

  useEffect(() => {
    if (user) {
      void checkIfSaved();
    } else {
      setIsCheckingSaved(false);
    }
  }, [user, postId, checkIfSaved]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id, text, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      const fetched = data ?? [];
      const userIds = Array.from(new Set(fetched.map((comment) => comment.user_id).filter(Boolean)));
      const profilesMap = new Map<string, CommentAuthor>();

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        profilesData?.forEach((profile) => {
          profilesMap.set(profile.id, {
            username: profile.username,
            avatar_url: profile.avatar_url,
          });
        });
      }

      const mapped: CommentItem[] = fetched.map((comment) => {
        const profile = profilesMap.get(comment.user_id);
        const fallbackUsername = comment.user_id === user?.id ? (user?.user_metadata?.username ?? user?.email ?? "You") : "Unknown";
        return {
          id: comment.id,
          text: comment.text,
          created_at: comment.created_at ?? new Date().toISOString(),
          user_id: comment.user_id,
          author: profile ?? {
            username: fallbackUsername,
            avatar_url: profile?.avatar_url ?? null,
          },
        };
      });

      setCommentsList(mapped);
      setCommentsCountState(mapped.length);
    } catch (error) {
      console.error("Failed to load comments", error);
      toast({
        title: "Unable to load comments",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setCommentsLoading(false);
    }
  }, [postId, toast, user?.email, user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    if (isCommentsOpen) {
      void loadComments();
    } else {
      setNewComment("");
    }
  }, [isCommentsOpen, loadComments]);

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Log in required",
        description: "Sign in to like posts.",
        variant: "destructive",
      });
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }

        setLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error && error.message.includes("duplicate")) {
          setLiked(true);
        } else if (error) {
          throw error;
        } else {
          setLiked(true);
          setLikesCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Unable to update like", error);
      toast({
        title: "Action failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommentAction = () => {
    if (!isCommentsOpen) {
      setIsCommentsOpen(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(permalink);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = permalink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast({
        title: "Link copied",
        description: "Post link copied to your clipboard.",
      });
    } catch (error) {
      console.error("Unable to copy link", error);
      toast({
        title: "Copy failed",
        description: "Unable to copy the post link.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${username}'s post`,
          text: caption,
          url: permalink,
        });
        toast({ title: "Shared", description: "Post shared successfully." });
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") {
          return;
        }
        console.error("Share failed", error);
      }
    }

    void handleCopyLink();
  };

  const handleEdit = () => {
    if (!isOwner) {
      toast({
        title: "Not allowed",
        description: "Only the creator can edit this post.",
        variant: "destructive",
      });
      return;
    }

    setEditCaption(localCaption ?? "");
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!isOwner || !user) {
      toast({
        title: "Not allowed",
        description: "Only the creator can delete this post.",
        variant: "destructive",
      });
      return;
    }

    if (isDeleting) {
      return;
    }

    const confirmed = typeof window !== "undefined" ? window.confirm("Delete this post?") : true;
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) {
        throw error;
      }

      toast({
        title: "Post deleted",
        description: "The post has been removed.",
      });
      onPostDeleted?.(postId);
    } catch (error) {
      console.error("Delete failed", error);
      toast({
        title: "Unable to delete",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "Log in required",
        description: "Sign in to comment.",
        variant: "destructive",
      });
      return;
    }

    const trimmed = newComment.trim();
    if (!trimmed) {
      toast({
        title: "Empty comment",
        description: "Write something before submitting.",
      });
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          text: trimmed,
        })
        .select("id, created_at")
        .single();

      if (error) {
        throw error;
      }

      const commentId = data?.id ?? crypto.randomUUID();
      const mentions = extractMentions(trimmed);
      if (mentions.length > 0) {
        await saveMentions(postId, commentId, mentions, user.id);
      }

      const newEntry: CommentItem = {
        id: commentId,
        text: trimmed,
        created_at: data?.created_at ?? new Date().toISOString(),
        user_id: user.id,
        author: {
          username: user.user_metadata?.username ?? user.email ?? "You",
          avatar_url: user.user_metadata?.avatar_url ?? null,
        },
      };

      setCommentsList((prev) => [...prev, newEntry]);
      setCommentsCountState((prev) => prev + 1);
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment is now visible.",
      });
    } catch (error) {
      console.error("Failed to add comment", error);
      toast({
        title: "Unable to add comment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const comment = commentsList.find((item) => item.id === commentId);
    if (!comment) return;

    if (!user || (comment.user_id !== user.id && !isOwner)) {
      toast({
        title: "Not allowed",
        description: "You can only remove your comments.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCommentsList((prev) => prev.filter((item) => item.id !== commentId));
      setCommentsCountState((prev) => Math.max(0, prev - 1));

      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Failed to delete comment", error);
      toast({
        title: "Unable to delete comment",
        description: "Please try again.",
        variant: "destructive",
      });
      void loadComments();
      setCommentsCountState(commentsList.length);
    }
  };

  const handleSaveEdit = async () => {
    if (!isOwner || !user) {
      toast({
        title: "Not allowed",
        description: "Only the creator can edit this post.",
        variant: "destructive",
      });
      return;
    }

    const trimmed = editCaption.trim();
    if (trimmed === localCaption) {
      setIsEditOpen(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ caption: trimmed || null })
        .eq("id", postId);

      if (error) {
        throw error;
      }

      setLocalCaption(trimmed);
      setIsEditOpen(false);
      toast({
        title: "Post updated",
        description: "Caption saved successfully.",
      });
    } catch (error) {
      console.error("Failed to update post", error);
      toast({
        title: "Unable to save",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleSave = async () => {
    if (!user) {
      toast({
        title: "Log in required",
        description: "Sign in to save posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) throw error;

        setIsSaved(false);
        toast({
          title: "Removed from saved",
          description: "Post removed from your saved posts.",
        });
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .insert({
            user_id: user.id,
            post_id: postId,
          });

        if (error && !error.message.includes("duplicate")) throw error;

        setIsSaved(true);
        toast({
          title: "Saved",
          description: "Post saved to your collection.",
        });
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      toast({
        title: "Action failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitReport = async () => {
    if (!user) {
      toast({
        title: "Log in required",
        description: "Sign in to report content.",
        variant: "destructive",
      });
      return;
    }

    if (!reportReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please select a reason for the report.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReport(true);
    try {
      const { error } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          post_id: postId,
          reason: reportReason,
          description: reportDescription.trim() || null,
        });

      if (error) throw error;

      setIsReportOpen(false);
      setReportReason("");
      setReportDescription("");
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe.",
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Unable to submit",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-[470px] overflow-hidden border-border shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar ?? undefined} />
              <AvatarFallback>{username[0]?.toUpperCase() ?? "U"}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{username}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCommentAction}>
                <MessageCircleMore className="mr-2 h-4 w-4" />
                Comment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsReportOpen(true)} className="text-destructive focus:text-destructive">
                <Flag className="mr-2 h-4 w-4" />
                Report post
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative aspect-square w-full bg-muted">
          {mediaType === "video" ? (
            <video 
              src={imageUrl} 
              className="h-full w-full object-cover"
              controls
              controlsList="nodownload"
            />
          ) : (
            <img src={imageUrl} alt={caption} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-colors ${liked ? "text-rose-500" : "hover:text-primary"}`}
                onClick={toggleLike}
                disabled={isProcessing}
              >
                <Heart className="h-6 w-6" fill={liked ? "currentColor" : "none"} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={handleCommentAction}>
                <MessageCircle className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={handleShare}>
                <Send className="h-6 w-6" />
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-8 w-8 hover:text-primary transition-colors ${isSaved ? "text-primary" : ""}`}
              onClick={toggleSave}
              disabled={isCheckingSaved}
            >
              <Bookmark className="h-6 w-6" fill={isSaved ? "currentColor" : "none"} />
            </Button>
          </div>

          <div className="mb-2 text-sm font-semibold">{likesCount.toLocaleString()} likes</div>

          <div className="mb-2 text-sm">
            <span className="mr-2 font-semibold">{username}</span>
            <span className="text-foreground whitespace-pre-wrap break-words">
              {localCaption ? (
                <>
                  {localCaption.split(/(\s+|#\w+)/g).map((part, index) => {
                    if (!part) return null;
                    if (part.startsWith('#')) {
                      return (
                        <a
                          key={index}
                          href={`/explore/hashtag/${part.toLowerCase().replace(/^#/, '')}`}
                          className="text-blue-500 hover:text-blue-600 font-semibold"
                        >
                          {part}
                        </a>
                      );
                    }
                    return <span key={index}>{part}</span>;
                  })}
                </>
              ) : null}
            </span>
          </div>

          {commentsCountState > 0 && (
            <button
              className="mb-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setIsCommentsOpen(true)}
            >
              View all {commentsCountState} comments
            </button>
          )}

          <div className="text-xs uppercase text-muted-foreground">{timeAgo}</div>
        </div>
      </Card>

      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Comments</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userAvatar ?? undefined} />
                <AvatarFallback>{username[0]?.toUpperCase() ?? "U"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-white">{username}</div>
                <div className="text-sm text-muted-foreground">{getRelativeTime(createdAt)}</div>
              </div>
            </div>

            <ScrollArea className="h-64 rounded-2xl border border-border bg-card p-4">
              {commentsLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Loading comments...
                </div>
              ) : commentsList.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No comments yet. Be the first to share your thoughts.
                </div>
              ) : (
                <div className="space-y-4">
                  {commentsList.map((comment) => (
                    <div key={comment.id} className="flex gap-3 rounded-xl border border-border bg-background/40 p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={comment.author.avatar_url ?? undefined} />
                        <AvatarFallback>{comment.author.username[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">{comment.author.username}</div>
                            <div className="text-xs text-muted-foreground">{getRelativeTime(comment.created_at)}</div>
                          </div>
                          {(comment.user_id === user?.id || isOwner) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {comment.text.split(/(@[\w]+)/g).map((part, i) => (
                            part.startsWith('@') ? (
                              <a
                                key={i}
                                href={`/explore?search=${part.replace(/^@/, '')}`}
                                className="text-blue-500 hover:text-blue-600 font-semibold"
                              >
                                {part}
                              </a>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                disabled={isSubmittingComment}
                maxLength={500}
              />
              <div className="flex justify-end">
                <Button
                  variant="gradient"
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment}
                >
                  {isSubmittingComment ? "Posting..." : "Post comment"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit caption</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editCaption}
            onChange={(event) => setEditCaption(event.target.value)}
            disabled={isSavingEdit}
            maxLength={2200}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Report post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                disabled={isSubmittingReport}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select a reason...</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="hate_speech">Hate speech</option>
                <option value="violence">Violence or dangerous</option>
                <option value="misinformation">Misinformation</option>
                <option value="copyright">Copyright violation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description (optional)</label>
              <Textarea
                placeholder="Provide more details..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                disabled={isSubmittingReport}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsReportOpen(false)} 
              disabled={isSubmittingReport}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmitReport} 
              disabled={isSubmittingReport}
            >
              {isSubmittingReport ? "Submitting..." : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostCard;
