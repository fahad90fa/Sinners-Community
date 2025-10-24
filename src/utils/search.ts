import { supabase } from "@/integrations/supabase/client";

export async function searchPosts(query: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        caption,
        created_at,
        user_id,
        profiles:user_id(username, avatar_url),
        likes(user_id),
        comments(id)
      `)
      .ilike("caption", `%${query}%`)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error searching posts:", error);
    return [];
  }
}

export async function searchUsers(query: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, followers_count")
      .ilike("username", `%${query}%`)
      .order("followers_count", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

export async function searchHashtags(query: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from("hashtags")
      .select("id, name, post_count")
      .ilike("name", `%${query}%`)
      .order("post_count", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error searching hashtags:", error);
    return [];
  }
}

export async function advancedSearch(options: {
  query?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  userId?: string;
  limit?: number;
}) {
  try {
    let query = supabase
      .from("posts")
      .select(`
        id,
        caption,
        created_at,
        user_id,
        location,
        profiles:user_id(username, avatar_url)
      `);

    if (options.query) {
      query = query.ilike("caption", `%${options.query}%`);
    }

    if (options.startDate) {
      query = query.gte("created_at", options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte("created_at", options.endDate.toISOString());
    }

    if (options.location) {
      query = query.ilike("location", `%${options.location}%`);
    }

    if (options.userId) {
      query = query.eq("user_id", options.userId);
    }

    query = query.eq("is_public", true);
    query = query.order("created_at", { ascending: false });
    query = query.limit(options.limit || 20);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in advanced search:", error);
    return [];
  }
}
