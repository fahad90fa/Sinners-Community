import { supabase } from "@/integrations/supabase/client";

export async function createPoll(postId: string, question: string, options: string[]) {
  try {
    const { data: pollData, error: pollError } = await supabase
      .from('polls')
      .insert({
        post_id: postId,
        question,
      })
      .select('id')
      .single();

    if (pollError) throw pollError;

    for (const optionText of options) {
      await supabase
        .from('poll_options')
        .insert({
          poll_id: pollData.id,
          option_text: optionText,
        });
    }

    return pollData.id;
  } catch (error) {
    console.error('Error creating poll:', error);
    throw error;
  }
}

export async function getPoll(pollId: string) {
  try {
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .single();

    if (pollError) throw pollError;

    const { data: options, error: optionsError } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId);

    if (optionsError) throw optionsError;

    return { ...poll, options: options || [] };
  } catch (error) {
    console.error('Error fetching poll:', error);
    return null;
  }
}

export async function votePoll(pollId: string, optionId: string, userId: string) {
  try {
    await supabase
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: userId,
      });

    const { data: option } = await supabase
      .from('poll_options')
      .select('vote_count')
      .eq('id', optionId)
      .single();

    const newCount = (option?.vote_count || 0) + 1;
    await supabase
      .from('poll_options')
      .update({ vote_count: newCount })
      .eq('id', optionId);
  } catch (error) {
    console.error('Error voting on poll:', error);
    throw error;
  }
}

export async function hasUserVoted(pollId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
