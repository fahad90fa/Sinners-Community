import { supabase } from "@/integrations/supabase/client";

export async function pinPost(userId: string, postId: string) {
  try {
    const { error } = await supabase
      .from('pinned_posts')
      .insert({
        user_id: userId,
        post_id: postId,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error pinning post:', error);
    throw error;
  }
}

export async function unpinPost(userId: string, postId: string) {
  try {
    const { error } = await supabase
      .from('pinned_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unpinning post:', error);
    throw error;
  }
}

export async function getPinnedPosts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('pinned_posts')
      .select('post_id, pinned_at')
      .eq('user_id', userId)
      .order('pinned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pinned posts:', error);
    return [];
  }
}

export async function isPostPinned(userId: string, postId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('pinned_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
