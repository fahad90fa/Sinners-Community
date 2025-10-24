import { supabase } from "@/integrations/supabase/client";

export async function getTrendingTopics(limit = 10) {
  try {
    const { data, error } = await supabase
      .from("trending_topics")
      .select("hashtag_name, post_count, trend_score")
      .order("trend_score", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching trending topics:", error);
    return [];
  }
}

export async function updateTrendingTopics() {
  try {
    const { data: hashtags } = await supabase
      .from("hashtags")
      .select("id, name, post_count");

    if (!hashtags) return;

    for (const hashtag of hashtags) {
      const trendScore = calculateTrendScore(hashtag.post_count);
      
      await supabase
        .from("trending_topics")
        .upsert({
          hashtag_name: hashtag.name,
          post_count: hashtag.post_count,
          trend_score: trendScore,
          updated_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("Error updating trending topics:", error);
  }
}

function calculateTrendScore(postCount: number): number {
  return Math.log(postCount + 1) * 10;
}

export async function getTrendingHashtags(limit = 10) {
  try {
    const { data, error } = await supabase
      .from("hashtags")
      .select("name, post_count")
      .order("post_count", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    return [];
  }
}

export async function getTrendingPosts(limit = 20) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        caption,
        created_at,
        user_id,
        view_count,
        profiles:user_id(username, avatar_url),
        likes(user_id),
        comments(id)
      `)
      .eq("is_public", true)
      .order("view_count", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching trending posts:", error);
    return [];
  }
}
