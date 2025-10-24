import { supabase } from "@/integrations/supabase/client";

export interface UserSuggestion {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  mutualFollowersCount: number;
  isFollowing: boolean;
}

export async function getUserSuggestions(
  userId: string,
  limit: number = 5
): Promise<UserSuggestion[]> {
  try {
    const { data: userFollowingIds } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", userId);

    if (!userFollowingIds || userFollowingIds.length === 0) {
      return getRandomUsers(userId, limit);
    }

    const followeeIds = userFollowingIds.map((f) => f.followee_id);

    const { data: suggestedUserIds } = await supabase
      .from("follows")
      .select("followee_id")
      .in("follower_id", followeeIds)
      .not("followee_id", "in", `(${[userId, ...followeeIds].join(",")})`);

    if (!suggestedUserIds || suggestedUserIds.length === 0) {
      return getRandomUsers(userId, limit);
    }

    const userIdCounts = new Map<string, number>();
    suggestedUserIds.forEach((item) => {
      userIdCounts.set(
        item.followee_id,
        (userIdCounts.get(item.followee_id) || 0) + 1
      );
    });

    const topUserIds = Array.from(userIdCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map((entry) => entry[0]);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .in("id", topUserIds);

    if (!profiles) return [];

    const followingData = await Promise.all(
      profiles.map(async (profile) => {
        const { data } = await supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", userId)
          .eq("followee_id", profile.id);

        return {
          profile,
          isFollowing: !!data && data.length > 0,
        };
      })
    );

    return followingData.map(({ profile, isFollowing }) => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      mutualFollowersCount: userIdCounts.get(profile.id) || 0,
      isFollowing,
    }));
  } catch (error) {
    console.error("Error getting user suggestions:", error);
    return [];
  }
}

async function getRandomUsers(
  userId: string,
  limit: number
): Promise<UserSuggestion[]> {
  try {
    const { data: userFollowingIds } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", userId);

    const followeeIds = userFollowingIds?.map((f) => f.followee_id) || [];
    const excludeIds = [userId, ...followeeIds];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .limit(limit);

    if (!profiles) return [];

    return profiles.map((profile) => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      mutualFollowersCount: 0,
      isFollowing: false,
    }));
  } catch (error) {
    console.error("Error getting random users:", error);
    return [];
  }
}
