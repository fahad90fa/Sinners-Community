-- Fix the conversation_members RLS policy to allow adding members to conversations
-- The current policy only allows inserting your own user_id, which prevents
-- creating conversations with other users

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Members insert" ON public.conversation_members;

-- Create a new policy that allows:
-- 1. Adding your own membership
-- 2. Adding other users if you're the first/only member of a new conversation
CREATE POLICY "Members insert" ON public.conversation_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (
      -- Allow adding other members if conversation was just created (max 1 member so far)
      (SELECT COUNT(*) FROM public.conversation_members WHERE conversation_id = conversation_members.conversation_id) < 2
      AND EXISTS (
        SELECT 1 FROM public.conversation_members cm2
        WHERE cm2.conversation_id = conversation_members.conversation_id
        AND cm2.user_id = auth.uid()
      )
    )
  );
