import { supabase } from "@/integrations/supabase/client";

export async function createDuet(userId: string, originalPostId: string, duetPostId: string) {
  try {
    const { data, error } = await supabase
      .from('duets')
      .insert({
        user_id: userId,
        original_post_id: originalPostId,
        duet_post_id: duetPostId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating duet:', error);
    throw error;
  }
}

export async function getDuetsForPost(postId: string) {
  try {
    const { data, error } = await supabase
      .from('duets')
      .select('*, profiles:user_id(*)')
      .eq('original_post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching duets:', error);
    return [];
  }
}

export async function getUserDuets(userId: string) {
  try {
    const { data, error } = await supabase
      .from('duets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user duets:', error);
    return [];
  }
}

export async function getDuetCount(postId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('duets')
      .select('*', { count: 'exact', head: true })
      .eq('original_post_id', postId);

    return count || 0;
  } catch {
    return 0;
  }
}
