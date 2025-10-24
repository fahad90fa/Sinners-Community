import { supabase } from "@/integrations/supabase/client";

export function extractMentions(text: string): string[] {
  const mentionRegex = /@[\w]+/g;
  const matches = text.match(mentionRegex) || [];
  return [...new Set(matches.map(mention => mention.toLowerCase()))];
}

export async function saveMentions(
  postId: string,
  commentId: string | null,
  mentions: string[],
  creatorUserId: string
): Promise<void> {
  if (mentions.length === 0) return;

  try {
    for (const mention of mentions) {
      const username = mention.toLowerCase().replace(/^@/, '');
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (!userProfile) continue;

      await supabase
        .from('mentions')
        .insert({
          post_id: postId,
          comment_id: commentId,
          mentioned_user_id: userProfile.id,
          creator_user_id: creatorUserId,
        });

      await createMentionNotification(
        userProfile.id,
        postId,
        commentId,
        creatorUserId
      );
    }
  } catch (error) {
    console.error('Error saving mentions:', error);
  }
}

export async function createMentionNotification(
  mentionedUserId: string,
  postId: string,
  commentId: string | null,
  creatorUserId: string
): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: mentionedUserId,
        actor_user_id: creatorUserId,
        post_id: postId,
        comment_id: commentId,
        type: 'mention',
      });
  } catch (error) {
    console.error('Error creating mention notification:', error);
  }
}

export function formatMentionsForDisplay(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@[\w]+/g;
  let lastIndex = 0;
  let match;

  const tempRegex = new RegExp(mentionRegex);
  const mentions = text.match(mentionRegex) || [];

  mentions.forEach((mention, index) => {
    const mentionIndex = text.indexOf(mention, lastIndex);
    if (mentionIndex !== -1) {
      if (mentionIndex > lastIndex) {
        parts.push(<span key={`text-${index}`}>{text.substring(lastIndex, mentionIndex)}</span>);
      }
      
      const username = mention.replace(/^@/, '');
      parts.push(
        <a
          key={`mention-${index}`}
          href={`/explore?search=${username}`}
          className="text-blue-500 hover:text-blue-600 font-semibold"
        >
          {mention}
        </a>
      );
      lastIndex = mentionIndex + mention.length;
    }
  });

  if (lastIndex < text.length) {
    parts.push(<span key="end">{text.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [text];
}

export async function getMentionedUsers(text: string): Promise<Array<{ id: string; username: string }>> {
  const mentions = extractMentions(text);
  if (mentions.length === 0) return [];

  try {
    const usernames = mentions.map(m => m.replace(/^@/, ''));
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', usernames);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching mentioned users:', error);
    return [];
  }
}
