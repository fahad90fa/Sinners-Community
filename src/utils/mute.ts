import { supabase } from "@/integrations/supabase/client";

export async function muteUser(userId: string, mutedUserId: string) {
  try {
    await supabase
      .from("muted_users")
      .insert({
        user_id: userId,
        muted_user_id: mutedUserId,
      });
  } catch (error) {
    console.error("Error muting user:", error);
    throw error;
  }
}

export async function unmuteUser(userId: string, mutedUserId: string) {
  try {
    await supabase
      .from("muted_users")
      .delete()
      .eq("user_id", userId)
      .eq("muted_user_id", mutedUserId);
  } catch (error) {
    console.error("Error unmuting user:", error);
    throw error;
  }
}

export async function getMutedUsers(userId: string) {
  try {
    const { data, error } = await supabase
      .from("muted_users")
      .select("muted_user_id, muted_at")
      .eq("user_id", userId)
      .order("muted_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching muted users:", error);
    return [];
  }
}

export async function isUserMuted(userId: string, mutedUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("muted_users")
      .select("id")
      .eq("user_id", userId)
      .eq("muted_user_id", mutedUserId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
