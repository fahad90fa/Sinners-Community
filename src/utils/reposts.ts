import { supabase } from "@/integrations/supabase/client";

export async function repostPost(userId: string, postId: string): Promise<void> {
  try {
    await supabase
      .from('reposts')
      .insert({
        user_id: userId,
        post_id: postId,
      });
  } catch (error) {
    console.error('Error reposting:', error);
    throw error;
  }
}

export async function removeRepost(userId: string, postId: string): Promise<void> {
  try {
    await supabase
      .from('reposts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
  } catch (error) {
    console.error('Error removing repost:', error);
    throw error;
  }
}

export async function isPostReposted(userId: string, postId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('reposts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

export async function getRepostCount(postId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('reposts')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getRepostsByUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from('reposts')
      .select('post_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reposts:', error);
    return [];
  }
}
