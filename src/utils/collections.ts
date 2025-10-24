import { supabase } from "@/integrations/supabase/client";

export async function createCollection(
  userId: string,
  name: string,
  description?: string
) {
  try {
    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: userId,
        name,
        description,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

export async function getCollections(userId: string) {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}

export async function addPostToCollection(collectionId: string, postId: string) {
  try {
    await supabase
      .from('collection_items')
      .insert({
        collection_id: collectionId,
        post_id: postId,
      });
  } catch (error) {
    console.error('Error adding to collection:', error);
    throw error;
  }
}

export async function removePostFromCollection(collectionId: string, postId: string) {
  try {
    await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('post_id', postId);
  } catch (error) {
    console.error('Error removing from collection:', error);
    throw error;
  }
}

export async function getCollectionPosts(collectionId: string) {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('post_id, added_at')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching collection posts:', error);
    return [];
  }
}

export async function deleteCollection(collectionId: string) {
  try {
    await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId);
  } catch (error) {
    console.error('Error deleting collection:', error);
    throw error;
  }
}
