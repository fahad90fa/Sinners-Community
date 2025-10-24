import { supabase } from "@/integrations/supabase/client";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function createReferralCode(userId: string) {
  try {
    const code = generateCode();
    const { data, error } = await supabase
      .from("referral_codes")
      .insert({
        user_id: userId,
        code,
        reward_amount: 10,
      })
      .select("code")
      .single();

    if (error) throw error;
    return data?.code;
  } catch (error) {
    console.error("Error creating referral code:", error);
    throw error;
  }
}

export async function getReferralCode(userId: string) {
  try {
    const { data, error } = await supabase
      .from("referral_codes")
      .select("code, used_count, reward_amount")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function validateReferralCode(code: string) {
  try {
    const { data, error } = await supabase
      .from("referral_codes")
      .select("user_id, reward_amount")
      .eq("code", code)
      .single();

    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function redeemReferralCode(referrerCode: string, referredUserId: string) {
  try {
    const referrerData = await validateReferralCode(referrerCode);
    if (!referrerData) throw new Error("Invalid referral code");

    const { error: rewardError } = await supabase
      .from("referral_rewards")
      .insert({
        referrer_id: referrerData.user_id,
        referred_id: referredUserId,
        reward_amount: referrerData.reward_amount,
      });

    if (rewardError) throw rewardError;

    await supabase
      .from("referral_codes")
      .update({ used_count: supabase.rpc("increment_count") })
      .eq("code", referrerCode);
  } catch (error) {
    console.error("Error redeeming referral code:", error);
    throw error;
  }
}

export async function getReferralRewards(userId: string) {
  try {
    const { data, error } = await supabase
      .from("referral_rewards")
      .select("reward_amount, claimed")
      .eq("referrer_id", userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching referral rewards:", error);
    return [];
  }
}

export async function claimReferralRewards(userId: string) {
  try {
    const { error } = await supabase
      .from("referral_rewards")
      .update({ claimed: true })
      .eq("referrer_id", userId)
      .eq("claimed", false);

    if (error) throw error;
  } catch (error) {
    console.error("Error claiming rewards:", error);
    throw error;
  }
}
