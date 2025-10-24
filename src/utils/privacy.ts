import { supabase } from "@/integrations/supabase/client";

export type PostVisibility = "public" | "private" | "followers_only";

export interface PrivacySettings {
  is_private: boolean;
  allow_messages: boolean;
  allow_comments: boolean;
  allow_mentions: boolean;
}

export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_private")
      .eq("id", userId)
      .single();

    if (error) throw error;

    return {
      is_private: data?.is_private ?? false,
      allow_messages: true,
      allow_comments: true,
      allow_mentions: true,
    };
  } catch (error) {
    console.error("Error fetching privacy settings:", error);
    return {
      is_private: false,
      allow_messages: true,
      allow_comments: true,
      allow_mentions: true,
    };
  }
}

export async function updatePrivacySettings(
  userId: string,
  settings: Partial<PrivacySettings>
): Promise<void> {
  try {
    const updateData: any = {};

    if (settings.is_private !== undefined) {
      updateData.is_private = settings.is_private;
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    throw error;
  }
}

export async function canViewProfile(viewerId: string, profileOwnerId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_private")
      .eq("id", profileOwnerId)
      .single();

    if (!profile?.is_private) {
      return true;
    }

    const { data: isFollowing } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", viewerId)
      .eq("followee_id", profileOwnerId);

    return !!isFollowing && isFollowing.length > 0;
  } catch (error) {
    console.error("Error checking profile visibility:", error);
    return false;
  }
}

export async function canViewPost(viewerId: string, postUserId: string, isPublic?: boolean): Promise<boolean> {
  if (isPublic === false) {
    if (viewerId === postUserId) {
      return true;
    }

    const { data: isFollowing } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", viewerId)
      .eq("followee_id", postUserId);

    return !!isFollowing && isFollowing.length > 0;
  }

  return true;
}

export async function canCommentOnPost(commenterId: string, postUserId: string): Promise<boolean> {
  try {
    const { data: privacySettings } = await supabase
      .from("posts")
      .select("is_public")
      .eq("user_id", postUserId)
      .single();

    if (!privacySettings || privacySettings.is_public) {
      return true;
    }

    if (commenterId === postUserId) {
      return true;
    }

    const { data: isFollowing } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", commenterId)
      .eq("followee_id", postUserId);

    return !!isFollowing && isFollowing.length > 0;
  } catch (error) {
    console.error("Error checking comment permission:", error);
    return false;
  }
}
