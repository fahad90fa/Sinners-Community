import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface NotificationItem {
  id: string;
  type: "like" | "comment" | "follow" | "mention";
  created_at: string;
  is_read: boolean | null;
  actor_user_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  actor?: {
    username: string;
    avatar_url: string | null;
  };
}

const Notifications = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      void fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, created_at, is_read, actor_user_id, post_id, comment_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const actorIds = Array.from(new Set(data.map((notification) => notification.actor_user_id).filter(Boolean))) as string[];
        const actorsMap = new Map<string, { username: string; avatar_url: string | null }>();

        if (actorIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", actorIds);

          if (!profilesError && profilesData) {
            profilesData.forEach((profile) => {
              actorsMap.set(profile.id, {
                username: profile.username,
                avatar_url: profile.avatar_url,
              });
            });
          }
        }

        const enhanced = data.map((notification) => ({
          ...notification,
          actor: notification.actor_user_id ? actorsMap.get(notification.actor_user_id) : undefined,
        })) as NotificationItem[];

        setItems(enhanced);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
      toast({
        title: "Unable to fetch notifications",
        description: "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id);
    if (unreadIds.length === 0) {
      toast({
        title: "No unread notifications",
        description: "You're all caught up!",
      });
      return;
    }

    try {
      setIsMarkingAll(true);
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;

      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      toast({
        title: "All caught up",
        description: "Your notifications have been marked as read.",
      });
    } catch (error) {
      console.error("Failed to mark notifications", error);
      toast({
        title: "Unable to update",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const formatMessage = (item: NotificationItem) => {
    const actorName = item.actor?.username ?? "Someone";
    switch (item.type) {
      case "like":
        return `${actorName} liked your post.`;
      case "comment":
        return `${actorName} commented on your post.`;
      case "follow":
        return `${actorName} started following you.`;
      case "mention":
        return `${actorName} mentioned you in a comment.`;
      default:
        return `${actorName} interacted with you.`;
    }
  };

  const getIcon = (item: NotificationItem) => {
    switch (item.type) {
      case "like":
        return <Heart className="h-4 w-4 text-rose-500" />;
      case "comment":
        return <MessageCircle className="h-4 w-4 text-sky-500" />;
      case "follow":
        return <UserPlus className="h-4 w-4 text-emerald-500" />;
      case "mention":
        return <MessageCircle className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

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
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">Stay in the loop with your community activity.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
                {unreadCount > 0 ? `${unreadCount} unread` : "No unread"}
              </Badge>
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={isMarkingAll}>
                {isMarkingAll ? "Updating..." : "Mark all as read"}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {isFetching ? (
                <div className="flex justify-center py-12">
                  <img src="/sinners.gif" alt="Loading notifications" className="h-16 w-16 rounded-full border border-primary object-cover" />
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  You're all caught up. New notifications will appear here.
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-6 py-5 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={item.actor?.avatar_url ?? undefined} />
                      <AvatarFallback>{item.actor?.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {getIcon(item)}
                        <span>{formatMessage(item)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!item.is_read && <Badge variant="outline">New</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Notifications;
