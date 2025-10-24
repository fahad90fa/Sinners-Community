import { supabase } from "@/integrations/supabase/client";

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex) || [];
  return [...new Set(matches.map(tag => tag.toLowerCase()))];
}

export async function saveHashtags(postId: string, hashtags: string[]): Promise<void> {
  if (hashtags.length === 0) return;

  try {
    for (const hashtag of hashtags) {
      const cleanTag = hashtag.toLowerCase().replace(/^#/, '');
      
      const { data: existingHashtag } = await supabase
        .from('hashtags')
        .select('id')
        .eq('name', cleanTag)
        .single();

      let hashtagId: string;

      if (!existingHashtag) {
        const { data: newHashtag, error } = await supabase
          .from('hashtags')
          .insert({ name: cleanTag })
          .select('id')
          .single();

        if (error) throw error;
        hashtagId = newHashtag.id;
      } else {
        hashtagId = existingHashtag.id;
      }

      await supabase
        .from('post_hashtags')
        .insert({
          post_id: postId,
          hashtag_id: hashtagId,
        })
        .eq('post_id', postId)
        .eq('hashtag_id', hashtagId);
    }
  } catch (error) {
    console.error('Error saving hashtags:', error);
  }
}

export async function getHashtagPosts(hashtag: string, limit: number = 60) {
  try {
    const cleanTag = hashtag.toLowerCase().replace(/^#/, '');

    const { data: hashtagData } = await supabase
      .from('hashtags')
      .select('id')
      .eq('name', cleanTag)
      .single();

    if (!hashtagData) {
      return [];
    }

    const { data: postHashtags } = await supabase
      .from('post_hashtags')
      .select('post_id')
      .eq('hashtag_id', hashtagData.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!postHashtags) return [];

    const postIds = postHashtags.map(ph => ph.post_id);

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        caption,
        created_at,
        user_id,
        media (
          url,
          type
        ),
        likes (
          user_id
        ),
        comments (
          id
        )
      `)
      .in('id', postIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return posts || [];
  } catch (error) {
    console.error('Error fetching hashtag posts:', error);
    return [];
  }
}

export async function getTrendingHashtags(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('hashtags')
      .select('name, post_count')
      .order('post_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    return [];
  }
}

export function formatHashtagsForDisplay(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const hashtagRegex = /#[\w]+/g;
  let lastIndex = 0;
  let match;

  const tempRegex = new RegExp(hashtagRegex);
  while ((match = tempRegex.exec(text)) !== null) {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex) || [];
    
    matches.forEach((tag, index) => {
      const tagIndex = text.indexOf(tag);
      if (tagIndex !== -1) {
        parts.push(
          <span key={`before-${index}`}>{text.substring(lastIndex, tagIndex)}</span>,
          <a
            key={`tag-${index}`}
            href={`/explore/hashtag/${tag.toLowerCase().replace(/^#/, '')}`}
            className="text-blue-500 hover:text-blue-600 font-semibold"
          >
            {tag}
          </a>
        );
        lastIndex = tagIndex + tag.length;
      }
    });
  }

  if (lastIndex < text.length) {
    parts.push(<span key="end">{text.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [text];
}
