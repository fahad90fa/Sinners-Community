-- Live chat schema per design spec

-- Conversations and membership
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  is_group BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (conversation_id, user_id)
);

-- Messages and attachments
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'system')),
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  mime TEXT,
  size BIGINT,
  width INTEGER,
  height INTEGER
);

-- Call sessions
CREATE TABLE public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Voicemails
CREATE TABLE public.voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  duration INTEGER,
  transcript TEXT
);

-- Indexes
CREATE INDEX idx_messages_conversation_created_at ON public.messages (conversation_id, created_at DESC);
CREATE INDEX idx_conversation_members_user_id ON public.conversation_members (user_id);
CREATE INDEX idx_attachments_message_id ON public.attachments (message_id);
CREATE INDEX idx_call_sessions_conversation_id ON public.call_sessions (conversation_id, started_at DESC);

-- Helper function for RLS checks
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicemails ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Conversations viewable to members" ON public.conversations
  FOR SELECT USING (public.is_conversation_member(id));

CREATE POLICY "Conversations writable by members" ON public.conversations
  FOR UPDATE USING (public.is_conversation_member(id));

CREATE POLICY "Insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members viewable by participants" ON public.conversation_members
  FOR SELECT USING (public.is_conversation_member(conversation_id));

CREATE POLICY "Members insert" ON public.conversation_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    )
  );

CREATE POLICY "Members update own record" ON public.conversation_members
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_conversation_member(conversation_id)
  );

CREATE POLICY "Messages viewable by members" ON public.messages
  FOR SELECT USING (public.is_conversation_member(conversation_id));

CREATE POLICY "Messages insert by members" ON public.messages
  FOR INSERT WITH CHECK (
    public.is_conversation_member(conversation_id)
    AND auth.uid() = sender_id
  );

CREATE POLICY "Messages update by sender" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Attachments viewable by members" ON public.attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id))
  );

CREATE POLICY "Attachments insert by members" ON public.attachments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id))
  );

CREATE POLICY "Call sessions viewable by members" ON public.call_sessions
  FOR SELECT USING (public.is_conversation_member(conversation_id));

CREATE POLICY "Call sessions insert by members" ON public.call_sessions
  FOR INSERT WITH CHECK (public.is_conversation_member(conversation_id));

CREATE POLICY "Voicemails viewable by members" ON public.voicemails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id))
  );

CREATE POLICY "Voicemails insert by members" ON public.voicemails
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id))
  );

-- Storage buckets for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-voicemails', 'chat-voicemails', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
CREATE POLICY "Chat attachments upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Chat attachments select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

-- Storage policies for voicemails bucket
CREATE POLICY "Voicemails upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-voicemails' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Voicemails select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-voicemails');
