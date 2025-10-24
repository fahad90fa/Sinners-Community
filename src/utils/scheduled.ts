import { supabase } from "@/integrations/supabase/client";

export async function createScheduledPost(
  userId: string,
  caption: string,
  location: string | null,
  isPublic: boolean,
  scheduledAt: Date
) {
  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: userId,
        caption,
        location,
        is_public: isPublic,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating scheduled post:', error);
    throw error;
  }
}

export async function getScheduledPosts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return [];
  }
}

export async function cancelScheduledPost(postId: string) {
  try {
    await supabase
      .from('scheduled_posts')
      .update({ status: 'cancelled' })
      .eq('id', postId);
  } catch (error) {
    console.error('Error cancelling scheduled post:', error);
    throw error;
  }
}

export async function publishScheduledPost(postId: string) {
  try {
    const { data: scheduledPost, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError) throw fetchError;

    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: scheduledPost.user_id,
        caption: scheduledPost.caption,
        location: scheduledPost.location,
        is_public: scheduledPost.is_public,
      })
      .select('id')
      .single();

    if (postError) throw postError;

    await supabase
      .from('scheduled_posts')
      .update({ status: 'published' })
      .eq('id', postId);

    return newPost;
  } catch (error) {
    console.error('Error publishing scheduled post:', error);
    throw error;
  }
}
