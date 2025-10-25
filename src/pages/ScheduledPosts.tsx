import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Trash2, Play, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getScheduledPosts, cancelScheduledPost, publishScheduledPost } from "@/utils/scheduled";

interface ScheduledPost {
  id: string;
  caption: string;
  location: string | null;
  scheduled_at: string;
  status: string;
  is_public: boolean;
}

export default function ScheduledPosts() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  const loadScheduledPosts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getScheduledPosts(user.id);
      setPosts(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scheduled posts",
        variant: "destructive",
      });
    } finally {
      setLoadingPosts(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      loadScheduledPosts();
    }
  }, [user, loading, navigate, loadScheduledPosts]);

  const handleCancel = async (postId: string) => {
    try {
      await cancelScheduledPost(postId);
      setPosts(posts.filter(p => p.id !== postId));
      toast({
        title: "Post cancelled",
        description: "Your scheduled post has been cancelled",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel post",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      setPublishing(postId);
      await publishScheduledPost(postId);
      setPosts(posts.filter(p => p.id !== postId));
      toast({
        title: "Post published",
        description: "Your post has been published successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish post",
        variant: "destructive",
      });
    } finally {
      setPublishing(null);
    }
  };

  const formatScheduleTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const scheduled = new Date(dateString);
    const diffMs = scheduled.getTime() - now.getTime();
    
    if (diffMs < 0) return "Due now";
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays > 0) return `${diffDays}d away`;
    if (diffHours > 0) return `${diffHours}h away`;
    if (diffMins > 0) return `${diffMins}m away`;
    return "Due now";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Scheduled Posts</h1>
            </div>
            <p className="text-muted-foreground">Manage your posts scheduled for the future</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {posts.length} {posts.length === 1 ? "post" : "posts"} scheduled
              </CardTitle>
              <CardDescription>
                Posts will be automatically published at their scheduled time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPosts ? (
                <div className="flex justify-center py-12">
                  <img src="/sinners.gif" alt="Loading" className="h-16 w-16 rounded-full" />
                </div>
              ) : posts.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p>No scheduled posts yet</p>
                  <p className="text-sm mt-2">Schedule posts from the Create page to see them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="flex flex-col gap-4 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium line-clamp-2">{post.caption || "No caption"}</p>
                            {post.is_public ? (
                              <Badge variant="outline">Public</Badge>
                            ) : (
                              <Badge variant="secondary">Private</Badge>
                            )}
                          </div>
                          {post.location && (
                            <p className="text-sm text-muted-foreground">📍 {post.location}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {formatScheduleTime(post.scheduled_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getTimeUntil(post.scheduled_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handlePublish(post.id)}
                            disabled={publishing === post.id}
                            className="gap-2"
                          >
                            <Play className="h-4 w-4" />
                            {publishing === post.id ? "Publishing..." : "Publish Now"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(post.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
