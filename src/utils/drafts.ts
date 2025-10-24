import { supabase } from "@/integrations/supabase/client";

export async function createDraft(userId: string, caption?: string, location?: string) {
  try {
    const { data, error } = await supabase
      .from('draft_posts')
      .insert({
        user_id: userId,
        caption,
        location,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating draft:', error);
    throw error;
  }
}

export async function updateDraft(draftId: string, caption?: string, location?: string) {
  try {
    const { error } = await supabase
      .from('draft_posts')
      .update({
        caption,
        location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating draft:', error);
    throw error;
  }
}

export async function getDrafts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('draft_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return [];
  }
}

export async function deleteDraft(draftId: string) {
  try {
    await supabase
      .from('draft_posts')
      .delete()
      .eq('id', draftId);
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw error;
  }
}

export async function getDraft(draftId: string) {
  try {
    const { data, error } = await supabase
      .from('draft_posts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching draft:', error);
    return null;
  }
}
