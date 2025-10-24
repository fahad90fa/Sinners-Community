import { supabase } from "@/integrations/supabase/client";

export async function getLeaderboards(period = "monthly", limit = 100) {
  try {
    const { data, error } = await supabase
      .from("leaderboards")
      .select(`
        id,
        user_id,
        rank,
        followers_count,
        engagement_score,
        profiles:user_id(username, avatar_url)
      `)
      .eq("period", period)
      .order("rank", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching leaderboards:", error);
    return [];
  }
}

export async function updateLeaderboards() {
  try {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, followers_count");

    if (!users) return;

    const usersWithScores = await Promise.all(
      users.map(async (user) => {
        const { count: likes } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", user.id);

        const { count: comments } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true });

        const { count: posts } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const engagementScore = posts ? ((likes || 0) + (comments || 0)) / posts : 0;
        return { ...user, engagementScore };
      })
    );

    usersWithScores.sort((a, b) => b.engagementScore - a.engagementScore);

    const leaderboardEntries = usersWithScores.map((user, index) => ({
      user_id: user.id,
      rank: index + 1,
      followers_count: user.followers_count,
      engagement_score: user.engagementScore,
      period: "monthly",
    }));

    for (const entry of leaderboardEntries) {
      await supabase
        .from("leaderboards")
        .upsert(entry);
    }
  } catch (error) {
    console.error("Error updating leaderboards:", error);
  }
}

export async function getUserRank(userId: string, period = "monthly") {
  try {
    const { data, error } = await supabase
      .from("leaderboards")
      .select("rank")
      .eq("user_id", userId)
      .eq("period", period)
      .single();

    if (error) throw error;
    return data?.rank || null;
  } catch {
    return null;
  }
}

export async function getTopCreators(limit = 10) {
  try {
    const { data, error } = await supabase
      .from("leaderboards")
      .select(`
        user_id,
        rank,
        followers_count,
        engagement_score,
        profiles:user_id(username, avatar_url)
      `)
      .eq("period", "monthly")
      .order("rank", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching top creators:", error);
    return [];
  }
}
