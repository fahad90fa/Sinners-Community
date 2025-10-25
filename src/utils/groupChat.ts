import { supabase } from "@/integrations/supabase/client";

export interface GroupChat {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export async function createGroupChat(createdBy: string, name: string, memberIds: string[]): Promise<GroupChat> {
  try {
    const uniqueMemberIds = Array.from(new Set([createdBy, ...memberIds]));
    
    const { data: chatId, error } = await supabase
      .rpc("create_group_chat", {
        p_name: name,
        p_created_by: createdBy,
        p_member_ids: uniqueMemberIds,
      });

    if (error) {
      throw new Error(`Failed to create group chat: ${error.message}`);
    }

    const { data: chatData } = await supabase
      .from("group_chats")
      .select("id, name, created_at, created_by")
      .eq("id", chatId)
      .single();

    if (!chatData) {
      throw new Error('No data returned from group chat creation');
    }

    return chatData;
  } catch (error) {
    console.error('Error creating group chat:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function getGroupChats(userId: string): Promise<GroupChat[]> {
  try {
    const { data, error } = await supabase
      .from('group_chat_members')
      .select('group_chat_id')
      .eq('user_id', userId);

    if (error) throw error;

    const chatIds = data?.map(d => d.group_chat_id) || [];
    if (chatIds.length === 0) return [];

    const { data: chats, error: chatsError } = await supabase
      .from('group_chats')
      .select('id, name, created_at, created_by')
      .in('id', chatIds)
      .order('created_at', { ascending: false });

    if (chatsError) throw chatsError;
    return chats || [];
  } catch (error) {
    console.error('Error fetching group chats:', error);
    return [];
  }
}

export async function sendGroupMessage(groupChatId: string, userId: string, content: string) {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .insert({
        group_chat_id: groupChatId,
        user_id: userId,
        content,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending group message:', error);
    throw error;
  }
}

export async function getGroupMessages(groupChatId: string) {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_chat_id', groupChatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return [];
  }
}

export async function addMemberToGroupChat(groupChatId: string, userId: string) {
  try {
    await supabase
      .from('group_chat_members')
      .insert({
        group_chat_id: groupChatId,
        user_id: userId,
      });
  } catch (error) {
    console.error('Error adding member to group chat:', error);
    throw error;
  }
}

export async function removeMemberFromGroupChat(groupChatId: string, userId: string) {
  try {
    await supabase
      .from('group_chat_members')
      .delete()
      .eq('group_chat_id', groupChatId)
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error removing member from group chat:', error);
    throw error;
  }
}
