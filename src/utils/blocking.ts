import { supabase } from "@/integrations/supabase/client";

export async function blockUser(userId: string, blockedUserId: string): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .insert({
      blocker_id: userId,
      blocked_id: blockedUserId,
    });

  if (error) throw error;
}

export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", blockedUserId);

  if (error) throw error;
}

export async function isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("blocks")
      .select("id", { count: "exact", head: true })
      .eq("blocker_id", userId)
      .eq("blocked_id", blockedUserId);

    if (error) throw error;
    return !!data && data.length > 0;
  } catch (error) {
    console.error("Error checking block status:", error);
    return false;
  }
}

export async function getBlockedUsers(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", userId);

    if (error) throw error;
    return data?.map((b) => b.blocked_id) || [];
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    return [];
  }
}
