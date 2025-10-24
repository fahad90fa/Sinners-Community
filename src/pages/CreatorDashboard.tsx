import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, TrendingUp, Users, Heart, MessageSquare, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  followers: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementRate: number;
  totalPosts: number;
  viewCount: number;
}

export default function CreatorDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    followers: 0,
    totalLikes: 0,
    totalComments: 0,
    avgEngagementRate: 0,
    totalPosts: 0,
    viewCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("followers_count")
        .eq("id", user.id)
        .single();

      const { data: posts } = await supabase
        .from("posts")
        .select("id, view_count")
        .eq("user_id", user.id);

      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { data: likes } = await supabase
        .from("likes")
        .select("*")
        .eq("post_id", posts?.[0]?.id);

      const { count: commentCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true });

      const totalViewCount = posts?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;

      setStats({
        followers: profileData?.followers_count || 0,
        totalLikes: likes?.length || 0,
        totalComments: commentCount || 0,
        avgEngagementRate: postCount ? ((likes?.length || 0) + (commentCount || 0)) / postCount : 0,
        totalPosts: postCount || 0,
        viewCount: totalViewCount,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      loadStats();
    }
  }, [user, loading, navigate, loadStats]);

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
        <div className="max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BarChart className="h-8 w-8" />
              Creator Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track your performance and engagement metrics
            </p>
          </div>

          {loadingStats ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading your stats...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Total Likes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Likes on your posts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total comments</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Engagement Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.avgEngagementRate.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Average per post</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPosts}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total posts published</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.viewCount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total post views</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-8">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Followers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.followers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total followers</p>
                </CardContent>
              </Card>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Content Calendar
                </CardTitle>
                <CardDescription>Plan and schedule your posts</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate("/scheduled-posts")}
                  className="w-full"
                >
                  View Calendar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monetization</CardTitle>
                <CardDescription>Earn from your content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">Total Earnings: <span className="font-bold">$0.00</span></p>
                  <Button className="w-full" variant="outline">
                    Enable Monetization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
