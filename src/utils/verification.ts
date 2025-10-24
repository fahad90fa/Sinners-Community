import { supabase } from "@/integrations/supabase/client";

export async function isUserVerified(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("verified_users")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw error;
    return !!data && data.length > 0;
  } catch (error) {
    console.error("Error checking verification status:", error);
    return false;
  }
}

export async function verifyUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("verified_users")
    .insert({
      user_id: userId,
    });

  if (error && !error.message.includes("duplicate")) throw error;
}

export async function unverifyUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("verified_users")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getVerifiedUsers(userIds: string[]): Promise<Set<string>> {
  try {
    if (userIds.length === 0) return new Set();

    const { data, error } = await supabase
      .from("verified_users")
      .select("user_id")
      .in("user_id", userIds);

    if (error) throw error;
    return new Set(data?.map((v) => v.user_id) || []);
  } catch (error) {
    console.error("Error fetching verified users:", error);
    return new Set();
  }
}
