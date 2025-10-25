import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, LogIn, MapPin, Monitor, Globe, Cpu } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoginDetails {
  country: string | null;
  city: string | null;
  ip_address: string;
  device_name: string | null;
  browser_name: string | null;
  os_name: string | null;
  logged_in_at: string;
}

interface NotificationItem {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "login";
  created_at: string;
  is_read: boolean | null;
  actor_user_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  notification_subtype: string | null;
  actor?: {
    username: string;
    avatar_url: string | null;
  };
  login_details?: LoginDetails;
}

const Notifications = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [selectedLoginNotif, setSelectedLoginNotif] = useState<NotificationItem | null>(null);

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
        .select("id, type, created_at, is_read, actor_user_id, post_id, comment_id, notification_subtype")
        .eq("user_id", user?.id)
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

        const loginNotifications = data.filter((n) => n.type === "login");
        const loginDetailsMap = new Map<string, LoginDetails>();

        if (loginNotifications.length > 0 && user?.id) {
          const { data: loginData, error: loginError } = await supabase
            .from("login_history")
            .select("country, city, ip_address, device_name, browser_name, os_name, logged_in_at")
            .eq("user_id", user.id)
            .order("logged_in_at", { ascending: false })
            .limit(loginNotifications.length);

          if (!loginError && loginData) {
            loginData.forEach((login, idx) => {
              if (loginNotifications[idx]) {
                loginDetailsMap.set(loginNotifications[idx].id, login as LoginDetails);
              }
            });
          }
        }

        const enhanced = data.map((notification) => ({
          ...notification,
          actor: notification.actor_user_id ? actorsMap.get(notification.actor_user_id) : undefined,
          login_details: notification.type === "login" ? loginDetailsMap.get(notification.id) : undefined,
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
        return `${actorName} liked your post`;
      case "comment":
        return `${actorName} commented on your post`;
      case "follow":
        return `${actorName} started following you`;
      case "mention":
        return `${actorName} mentioned you in a comment`;
      case "login": {
        const details = item.login_details;
        if (details) {
          const location = details.city && details.country 
            ? `${details.city}, ${details.country}` 
            : details.country || "Unknown";
          return `New login from ${location}`;
        }
        return `New login detected`;
      }
      default:
        return `${actorName} interacted with you`;
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
      case "login":
        return <LogIn className="h-4 w-4 text-amber-500" />;
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
                    className={`flex items-start gap-4 px-6 py-5 transition-colors hover:bg-muted/50 ${
                      item.type === "login" ? "cursor-pointer" : ""
                    }`}
                    onClick={() => item.type === "login" && setSelectedLoginNotif(item)}
                  >
                    <Avatar className="h-12 w-12 border border-border flex-shrink-0">
                      {item.type !== "login" && item.actor?.avatar_url && (
                        <AvatarImage src={item.actor.avatar_url} />
                      )}
                      <AvatarFallback>
                        {item.type === "login" ? "🔐" : item.actor?.username?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {getIcon(item)}
                        <span className="truncate">{formatMessage(item)}</span>
                      </div>
                      {item.type === "login" && item.login_details && (
                        <div className="text-xs text-muted-foreground space-y-1 pl-6">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-3 w-3" />
                            <span>{item.login_details.device_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <span>{item.login_details.browser_name} on {item.login_details.os_name}</span>
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!item.is_read && <Badge variant="outline" className="flex-shrink-0">New</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!selectedLoginNotif} onOpenChange={() => setSelectedLoginNotif(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-amber-500" />
              Login Details
            </DialogTitle>
          </DialogHeader>
          {selectedLoginNotif?.login_details && (
            <div className="space-y-4">
              <Card className="border-0 bg-muted/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">LOCATION</div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-rose-500" />
                      <span className="font-medium">
                        {selectedLoginNotif.login_details.city}, {selectedLoginNotif.login_details.country}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">IP ADDRESS</div>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <Globe className="h-4 w-4 text-sky-500" />
                      <span className="break-all">{selectedLoginNotif.login_details.ip_address}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">DEVICE</div>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-sm">{selectedLoginNotif.login_details.device_name}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">OS</div>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-violet-500" />
                        <span className="font-medium text-sm">{selectedLoginNotif.login_details.os_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">BROWSER</div>
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{selectedLoginNotif.login_details.browser_name}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">LOGIN TIME</div>
                    <span className="text-sm">
                      {new Date(selectedLoginNotif.login_details.logged_in_at).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                If this wasn't you, consider changing your password immediately.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
