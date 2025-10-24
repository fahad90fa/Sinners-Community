import { supabase } from "@/integrations/supabase/client";

export async function ratePost(userId: string, postId: string, rating: number) {
  try {
    const { error } = await supabase
      .from('post_ratings')
      .upsert({
        user_id: userId,
        post_id: postId,
        rating: Math.min(5, Math.max(1, rating)),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error rating post:', error);
    throw error;
  }
}

export async function getPostRating(userId: string, postId: string) {
  try {
    const { data, error } = await supabase
      .from('post_ratings')
      .select('rating')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (error) throw error;
    return data?.rating || 0;
  } catch {
    return 0;
  }
}

export async function getAverageRating(postId: string) {
  try {
    const { data, error } = await supabase
      .from('post_ratings')
      .select('rating')
      .eq('post_id', postId);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const sum = data.reduce((acc, item) => acc + item.rating, 0);
    return sum / data.length;
  } catch {
    return 0;
  }
}

export async function addEmojiReaction(userId: string, postId: string, emoji: string) {
  try {
    const { error } = await supabase
      .from('post_emoji_reactions')
      .insert({
        user_id: userId,
        post_id: postId,
        emoji,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error adding emoji reaction:', error);
    throw error;
  }
}

export async function removeEmojiReaction(userId: string, postId: string, emoji: string) {
  try {
    const { error } = await supabase
      .from('post_emoji_reactions')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
      .eq('emoji', emoji);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing emoji reaction:', error);
    throw error;
  }
}

export async function getPostReactions(postId: string) {
  try {
    const { data, error } = await supabase
      .from('post_emoji_reactions')
      .select('emoji, user_id')
      .eq('post_id', postId);

    if (error) throw error;
    
    const reactionCounts: Record<string, number> = {};
    data?.forEach(reaction => {
      reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
    });
    
    return reactionCounts;
  } catch {
    return {};
  }
}
