-- Create a function to handle conversation creation with members
-- This avoids RLS conflicts when adding both users as members

CREATE OR REPLACE FUNCTION public.create_conversation_with_members(
  p_is_group BOOLEAN DEFAULT false,
  p_other_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Insert conversation
  INSERT INTO public.conversations (is_group)
  VALUES (p_is_group)
  RETURNING id INTO v_conversation_id;

  -- Add current user as member
  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_conversation_id, auth.uid());

  -- Add other user as member if provided (for direct messages)
  IF p_other_user_id IS NOT NULL THEN
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (v_conversation_id, p_other_user_id);
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_conversation_with_members TO authenticated;

-- Update the Members insert policy to allow adding other users to new conversations
DROP POLICY IF EXISTS "Members insert" ON public.conversation_members;

CREATE POLICY "Members insert" ON public.conversation_members
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.conversation_members cm2
      WHERE cm2.conversation_id = conversation_id
      AND cm2.user_id = auth.uid()
    ))
    AND EXISTS (
      SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    )
  );
