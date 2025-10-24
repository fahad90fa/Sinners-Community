import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Bell, FileWarning, Loader2, MessageSquare, RefreshCw, Settings, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type MediaRow = Database["public"]["Tables"]["media"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];

type PostWithProfile = PostRow & {
  profile: Pick<ProfileRow, "id" | "username" | "display_name"> | null;
};

type MediaWithRelations = MediaRow & {
  post: (PostRow & { profile: Pick<ProfileRow, "id" | "username" | "display_name"> | null }) | null;
};

type MessageWithConversation = MessageRow & {
  conversations: Pick<ConversationRow, "title"> | null;
};

type ChartPoint = {
  day: string;
  users: number;
  posts: number;
  comments: number;
};

type Metrics = {
  totalUsers: number;
  privateUsers: number;
  totalPosts: number;
  privatePosts: number;
  totalLikes: number;
  totalComments: number;
  totalMedia: number;
};

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST301", "PGRST102"]);

const isMissingTableError = (error: PostgrestError | null, table: string) => {
  if (!error) return false;
  if (error.code && MISSING_TABLE_CODES.has(error.code)) return true;
  const target = `public.${table}`;
  return [error.message, error.details, error.hint].some((value) => typeof value === "string" && value.includes(target));
};

const resolveTableData = <T,>(
  response: PostgrestSingleResponse<T[]>,
  table: string
): T[] => {
  if (isMissingTableError(response.error, table)) {
    return [];
  }
  if (response.error) {
    throw response.error;
  }
  return response.data ?? [];
};

const NAV_SECTIONS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "user-management", label: "User Management", icon: Users },
  { key: "moderation", label: "Moderation Queue", icon: FileWarning },
  { key: "live-chat", label: "Live Chat", icon: MessageSquare },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "configuration", label: "Configuration", icon: Settings }
] as const;

const CHART_CONFIG: ChartConfig = {
  users: { label: "New Users", color: "hsl(355, 80%, 50%)" },
  posts: { label: "Posts", color: "hsl(212, 96%, 62%)" },
  comments: { label: "Comments", color: "hsl(46, 100%, 56%)" }
};

const buildCountMap = (rows: Array<{ created_at: string | null }> | null) => {
  const map = new Map<string, number>();
  if (!rows) return map;
  for (const row of rows) {
    if (!row.created_at) continue;
    const key = row.created_at.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
};

const formatAbsolute = (value: string | null) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<typeof NAV_SECTIONS[number]["key"]>("overview");
  const [accessInput, setAccessInput] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    privateUsers: 0,
    totalPosts: 0,
    privatePosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalMedia: 0
  });
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [moderationItems, setModerationItems] = useState<PostWithProfile[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaWithRelations[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [chatMessages, setChatMessages] = useState<MessageWithConversation[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const adminAccessCode = (import.meta.env.VITE_ADMIN_ACCESS_CODE ?? "") as string;
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!adminAccessCode) {
      setAccessGranted(false);
      localStorage.removeItem("adminAccessKey");
      return;
    }
    const storedKey = localStorage.getItem("adminAccessKey");
    if (storedKey === adminAccessCode) {
      setAccessGranted(true);
    } else {
      localStorage.removeItem("adminAccessKey");
      setAccessGranted(false);
    }
  }, [adminAccessCode]);

  useEffect(() => {
    if (!accessGranted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const nextKey = visible[0].target.id as typeof NAV_SECTIONS[number]["key"];
          setActiveSection(nextKey);
        }
      },
      { threshold: 0.25, rootMargin: "-120px 0px -40%" }
    );
    const sections = NAV_SECTIONS.map((item) => document.getElementById(item.key)).filter(
      (section): section is HTMLElement => section !== null
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      sections.forEach((section) => observer.unobserve(section));
      observer.disconnect();
    };
  }, [accessGranted]);

  const fetchAdminData = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoadingData(true);
    setLoadError(null);
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 6);
      const sinceIso = sinceDate.toISOString();

      const [
        profileCountRes,
        privateProfileCountRes,
        postsCountRes,
        privatePostsCountRes,
        likesCountRes,
        commentsCountRes,
        mediaCountRes
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_private", true),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_public", false),
        supabase.from("likes").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        supabase.from("media").select("id", { count: "exact", head: true })
      ]);

      if (profileCountRes.error) throw profileCountRes.error;
      if (privateProfileCountRes.error) throw privateProfileCountRes.error;
      if (postsCountRes.error) throw postsCountRes.error;
      if (privatePostsCountRes.error) throw privatePostsCountRes.error;
      if (likesCountRes.error) throw likesCountRes.error;
      if (commentsCountRes.error) throw commentsCountRes.error;
      if (mediaCountRes.error) throw mediaCountRes.error;

      const metricsPayload: Metrics = {
        totalUsers: profileCountRes.count ?? 0,
        privateUsers: privateProfileCountRes.count ?? 0,
        totalPosts: postsCountRes.count ?? 0,
        privatePosts: privatePostsCountRes.count ?? 0,
        totalLikes: likesCountRes.count ?? 0,
        totalComments: commentsCountRes.count ?? 0,
        totalMedia: mediaCountRes.count ?? 0
      };

      const [profilesRecentRes, postsRecentRes, commentsRecentRes] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", sinceIso),
        supabase.from("posts").select("created_at").gte("created_at", sinceIso),
        supabase.from("comments").select("created_at").gte("created_at", sinceIso)
      ]);

      if (profilesRecentRes.error) throw profilesRecentRes.error;
      if (postsRecentRes.error) throw postsRecentRes.error;
      if (commentsRecentRes.error) throw commentsRecentRes.error;

      const profilesMap = buildCountMap(profilesRecentRes.data ?? null);
      const postsMap = buildCountMap(postsRecentRes.data ?? null);
      const commentsMap = buildCountMap(commentsRecentRes.data ?? null);

      const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return {
          iso: date.toISOString().slice(0, 10),
          label: date.toLocaleDateString(undefined, { weekday: "short" })
        };
      });

      const chart = days.map<ChartPoint>((day) => ({
        day: day.label,
        users: profilesMap.get(day.iso) ?? 0,
        posts: postsMap.get(day.iso) ?? 0,
        comments: commentsMap.get(day.iso) ?? 0
      }));

      const [
        latestProfilesRes,
        reviewPostsRes,
        mediaRes,
        notificationsRes
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("posts")
          .select("*")
          .eq("is_public", false)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("media")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8)
      ]);

      if (latestProfilesRes.error) throw latestProfilesRes.error;
      if (reviewPostsRes.error) throw reviewPostsRes.error;
      if (mediaRes.error) throw mediaRes.error;

      const notificationsData = resolveTableData<NotificationRow>(notificationsRes, "notifications");

      const messagesRes = await supabase
        .from("messages")
        .select("*, conversations ( title )")
        .order("created_at", { ascending: false })
        .limit(8);

      const chatData = resolveTableData<MessageWithConversation>(messagesRes, "messages");

      const moderationPosts = (reviewPostsRes.data ?? []) as PostRow[];
      const mediaRows = (mediaRes.data ?? []) as MediaRow[];

      let mediaPosts: PostRow[] = [];
      const mediaPostIds = Array.from(new Set(mediaRows.map((item) => item.post_id).filter((id): id is string => Boolean(id))));
      if (mediaPostIds.length > 0) {
        const mediaPostsRes = await supabase
          .from("posts")
          .select("*")
          .in("id", mediaPostIds);
        if (mediaPostsRes.error) throw mediaPostsRes.error;
        mediaPosts = mediaPostsRes.data ?? [];
      }

      const profileIds = new Set<string>();
      moderationPosts.forEach((post) => {
        if (post.user_id) {
          profileIds.add(post.user_id);
        }
      });
      mediaPosts.forEach((post) => {
        if (post.user_id) {
          profileIds.add(post.user_id);
        }
      });

      let profileMap = new Map<string, Pick<ProfileRow, "id" | "username" | "display_name">>();
      if (profileIds.size > 0) {
        const profilesLookupRes = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", Array.from(profileIds));
        if (profilesLookupRes.error) throw profilesLookupRes.error;
        profileMap = new Map((profilesLookupRes.data ?? []).map((profile) => [profile.id, profile]));
      }

      const moderationWithProfiles = moderationPosts.map<PostWithProfile>((post) => ({
        ...post,
        profile: profileMap.get(post.user_id) ?? null
      }));

      const mediaPostMap = new Map(mediaPosts.map((post) => [post.id, post]));
      const mediaWithRelations = mediaRows.map<MediaWithRelations>((item) => {
        const post = mediaPostMap.get(item.post_id) ?? null;
        return {
          ...item,
          post: post
            ? {
                ...post,
                profile: profileMap.get(post.user_id) ?? null
              }
            : null
        };
      });

      if (!isMounted.current) {
        return;
      }

      setMetrics(metricsPayload);
      setChartData(chart);
      setUsers(latestProfilesRes.data ?? []);
      setModerationItems(moderationWithProfiles);
      setMediaItems(mediaWithRelations);
      setNotifications(notificationsData);
      setChatMessages(chatData);
    } catch (error) {
      const message = (() => {
        if (error instanceof Error) return error.message;
        if (typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string") {
          return (error as { message: string }).message;
        }
        return "An unexpected error occurred.";
      })();
      if (isMounted.current) {
        setLoadError(message);
        toast({
          title: "Failed to load admin data",
          description: message,
          variant: "destructive"
        });
      }
    } finally {
      if (isMounted.current) {
        setLoadingData(false);
      }
    }
  }, [toast, user]);

  useEffect(() => {
    if (accessGranted && user) {
      fetchAdminData();
    }
  }, [accessGranted, fetchAdminData, user]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center">
          <img src="/sinners.gif" alt="Loading" className="mx-auto h-16 w-16 rounded-full border border-primary object-cover" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!adminAccessCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin access unavailable</CardTitle>
            <CardDescription>Set VITE_ADMIN_ACCESS_CODE in the environment to unlock the admin portal.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>Enter the admin access ID to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessError ? (
              <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {accessError}
              </div>
            ) : null}
            <form
              className="space-y-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                if (!adminAccessCode) {
                  setAccessError("Admin access code is not configured.");
                  return;
                }
                if (accessInput.trim() === adminAccessCode) {
                  localStorage.setItem("adminAccessKey", adminAccessCode);
                  setAccessGranted(true);
                  setAccessError(null);
                  setAccessInput("");
                } else {
                  setAccessError("Invalid admin access ID.");
                }
              }}
            >
              <Input
                type="password"
                value={accessInput}
                onChange={(event) => {
                  setAccessInput(event.target.value);
                  if (accessError) {
                    setAccessError(null);
                  }
                }}
                placeholder="Enter admin access ID"
              />
              <Button type="submit" className="w-full">
                Unlock Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r bg-muted/40 lg:flex lg:flex-col">
        <div className="flex items-center gap-2 p-6">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Control Center</p>
            <p className="text-lg font-semibold">Admin Console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4 pb-6">
          {NAV_SECTIONS.map((item) => (
            <Button
              key={item.key}
              variant={activeSection === item.key ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => {
                setActiveSection(item.key);
                const section = document.getElementById(item.key);
                if (section) {
                  section.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="space-y-3 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin session</CardTitle>
              <CardDescription>Access verified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Signed in as {user?.email ?? "unknown"}.</p>
              <p className="text-xs text-muted-foreground">Admin code: ****{adminAccessCode.slice(-2)}</p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  localStorage.removeItem("adminAccessKey");
                  setAccessGranted(false);
                }}
              >
                Lock admin view
              </Button>
            </CardFooter>
          </Card>
        </div>
      </aside>
      <main className="overflow-y-auto">
        <div className="border-b bg-background/80 backdrop-blur">
          <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform insights sourced directly from Supabase.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="gap-2" onClick={fetchAdminData} disabled={loadingData}>
                {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh data
              </Button>
            </div>
          </div>
        </div>
        {loadError ? (
          <div className="px-6 pt-4">
            <Card className="border-destructive/60 bg-destructive/10">
              <CardContent className="py-4 text-sm text-destructive-foreground">{loadError}</CardContent>
            </Card>
          </div>
        ) : null}
        <div className="space-y-10 p-6">
          <section id="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="space-y-0 pb-2">
                  <CardDescription>Total users</CardDescription>
                  <CardTitle className="text-3xl">{numberFormatter.format(metrics.totalUsers)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {numberFormatter.format(metrics.privateUsers)} private accounts
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="space-y-0 pb-2">
                  <CardDescription>Total posts</CardDescription>
                  <CardTitle className="text-3xl">{numberFormatter.format(metrics.totalPosts)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {numberFormatter.format(metrics.privatePosts)} unpublished
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="space-y-0 pb-2">
                  <CardDescription>Total likes</CardDescription>
                  <CardTitle className="text-3xl">{numberFormatter.format(metrics.totalLikes)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Engagement recorded</CardContent>
              </Card>
              <Card>
                <CardHeader className="space-y-0 pb-2">
                  <CardDescription>Total comments</CardDescription>
                  <CardTitle className="text-3xl">{numberFormatter.format(metrics.totalComments)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Community feedback</CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>Weekly activity</CardTitle>
                <CardDescription>Rolling 7-day window</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No activity recorded in the last 7 days.
                  </div>
                ) : (
                  <ChartContainer config={CHART_CONFIG} className="mt-6">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                      <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area type="monotone" dataKey="users" stroke="var(--color-users)" fill="var(--color-users)" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="posts" stroke="var(--color-posts)" fill="var(--color-posts)" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="comments" stroke="var(--color-comments)" fill="var(--color-comments)" fillOpacity={0.2} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </section>
          <section id="user-management" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">User management</h2>
                <p className="text-sm text-muted-foreground">Latest profile registrations</p>
              </div>
              <Badge variant="outline">{users.length} records</Badge>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Display name</TableHead>
                      <TableHead>Privacy</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          No profiles available for your account scope.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">@{profile.username}</TableCell>
                          <TableCell>{profile.display_name ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={profile.is_private ? "secondary" : "outline"}>
                              {profile.is_private ? "Private" : "Public"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {profile.created_at
                              ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {profile.updated_at
                              ? formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true })
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
          <section id="moderation" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Moderation queue</h2>
                <p className="text-sm text-muted-foreground">Posts pending publication</p>
              </div>
              <Badge variant="outline">{numberFormatter.format(metrics.privatePosts)}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {moderationItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No unpublished posts visible to your account.
                  </CardContent>
                </Card>
              ) : (
                moderationItems.map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg">
                        {item.profile?.username ? `@${item.profile.username}` : "Unknown user"}
                      </CardTitle>
                      <CardDescription>{formatAbsolute(item.created_at)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{item.caption ?? "No caption provided."}</p>
                      <Badge variant="destructive">Not public</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
          <section id="live-chat" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Live chat</h2>
                <p className="text-sm text-muted-foreground">Most recent messages you can access</p>
              </div>
              <Badge variant="outline">{chatMessages.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {chatMessages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No conversations are available under your membership.
                  </CardContent>
                </Card>
              ) : (
                chatMessages.map((message) => (
                  <Card key={message.id}>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg">{message.conversations?.title ?? "Conversation"}</CardTitle>
                      <CardDescription>
                        {message.created_at
                          ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
                          : "N/A"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge variant="outline">{message.type ?? "text"}</Badge>
                      <p className="text-sm text-muted-foreground">{message.content ?? "No content provided."}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
          <section id="notifications" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Notifications</h2>
                <p className="text-sm text-muted-foreground">Latest events delivered to your account</p>
              </div>
              <Badge variant="outline">{notifications.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {notifications.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">No notifications to review.</CardContent>
                </Card>
              ) : (
                notifications.map((notification) => (
                  <Card key={notification.id}>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg capitalize">{notification.type}</CardTitle>
                      <CardDescription>{formatAbsolute(notification.created_at)}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <Badge variant={notification.is_read ? "outline" : "secondary"}>
                        {notification.is_read ? "Read" : "Unread"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
          <section id="configuration" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Configuration</h2>
                <p className="text-sm text-muted-foreground">Platform signals derived from live data</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle>Privacy controls</CardTitle>
                  <CardDescription>Private account adoption</CardDescription>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">
                  {metrics.totalUsers === 0
                    ? "0%"
                    : `${((metrics.privateUsers / metrics.totalUsers) * 100).toFixed(1)}%`}
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  {numberFormatter.format(metrics.privateUsers)} of {numberFormatter.format(metrics.totalUsers)} profiles
                </CardFooter>
              </Card>
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle>Publication status</CardTitle>
                  <CardDescription>Posts awaiting visibility</CardDescription>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">
                  {numberFormatter.format(metrics.privatePosts)}
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">Accessible unpublished posts</CardFooter>
              </Card>
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle>Media inventory</CardTitle>
                  <CardDescription>Total uploaded assets</CardDescription>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">
                  {numberFormatter.format(metrics.totalMedia)}
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">Latest sample shown below</CardFooter>
              </Card>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Recent media</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {mediaItems.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      No media entries available.
                    </CardContent>
                  </Card>
                ) : (
                  mediaItems.map((item) => (
                    <Card key={item.id}>
                      <CardHeader className="space-y-1">
                        <CardTitle className="text-lg">
                          {item.post?.profile?.username ? `@${item.post.profile.username}` : "Unknown user"}
                        </CardTitle>
                        <CardDescription>{formatAbsolute(item.created_at)}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Badge variant="outline">{item.type}</Badge>
                        <p className="text-sm text-muted-foreground">Post ID: {item.post?.id ?? "N/A"}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
