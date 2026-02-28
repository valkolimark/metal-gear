-- ============================================================================
-- Metal Gear — Messaging Tables Migration
-- Conversations & Messages with Realtime support
-- ============================================================================

-- ─── Conversations ──────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, buyer_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants can view their conversations
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Buyers can start conversations
CREATE POLICY "Buyers can start conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Participants can update conversations (for last_message_at)
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE INDEX conversations_buyer_id_idx ON public.conversations (buyer_id);
CREATE INDEX conversations_seller_id_idx ON public.conversations (seller_id);
CREATE INDEX conversations_listing_id_idx ON public.conversations (listing_id);
CREATE INDEX conversations_last_message_idx ON public.conversations (last_message_at DESC);

-- ─── Messages ───────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversation participants can view messages
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

-- Conversation participants can send messages
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

-- Recipients can mark messages as read
CREATE POLICY "Recipients can update messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

CREATE INDEX messages_conversation_id_idx ON public.messages (conversation_id);
CREATE INDEX messages_sender_id_idx ON public.messages (sender_id);
CREATE INDEX messages_created_at_idx ON public.messages (created_at DESC);
CREATE INDEX messages_unread_idx ON public.messages (conversation_id, read_at) WHERE read_at IS NULL;

-- ─── Function: Update last_message_at on new message ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- ─── Enable Realtime for messages ───────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
