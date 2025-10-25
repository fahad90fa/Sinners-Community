-- Enable RLS on group chat tables
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Policies for group_chats
CREATE POLICY "Group chats viewable by members" ON public.group_chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members
      WHERE group_chat_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group chats insertable by authenticated users" ON public.group_chats
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Group chats updatable by creator" ON public.group_chats
  FOR UPDATE USING (auth.uid() = created_by);

-- Policies for group_chat_members
CREATE POLICY "Group members viewable by chat members" ON public.group_chat_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members cm2
      WHERE cm2.group_chat_id = group_chat_id AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members insertable by authenticated users" ON public.group_chat_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Group members updatable by self" ON public.group_chat_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Group members deletable by self or chat member" ON public.group_chat_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_chat_members cm2
      WHERE cm2.group_chat_id = group_chat_id AND cm2.user_id = auth.uid()
    )
  );

-- Policies for group_messages
CREATE POLICY "Group messages viewable by chat members" ON public.group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members
      WHERE group_chat_id = group_messages.group_chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group messages insertable by chat members" ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_chat_members
      WHERE group_chat_id = group_messages.group_chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group messages updatable by sender" ON public.group_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Group messages deletable by sender" ON public.group_messages
  FOR DELETE USING (auth.uid() = user_id);
