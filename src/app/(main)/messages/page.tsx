'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Send,
  Loader2,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import type { Tables } from '@/types/database'

type Conversation = Tables<'conversations'>
type Message = Tables<'messages'>
type Profile = Tables<'profiles'>
type Listing = Tables<'listings'>

interface ConversationWithDetails extends Conversation {
  other_user: Profile | null
  listing: Listing | null
  last_message: Message | null
  unread_count: number
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const { setUnreadMessages } = useUIStore()

  const [conversations, setConversations] = useState<
    ConversationWithDetails[]
  >([])
  const [activeConvId, setActiveConvId] = useState<string | null>(
    searchParams.get('conversation')
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load conversations
  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    async function loadConversations() {
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      const enriched: ConversationWithDetails[] = await Promise.all(
        (convs ?? []).map(async (conv) => {
          const otherId =
            conv.buyer_id === user!.id ? conv.seller_id : conv.buyer_id

          const [profileRes, listingRes, lastMsgRes, unreadRes] =
            await Promise.all([
              supabase.from('profiles').select('*').eq('id', otherId).single(),
              supabase
                .from('listings')
                .select('*')
                .eq('id', conv.listing_id)
                .single(),
              supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single(),
              supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user!.id)
                .is('read_at', null),
            ])

          return {
            ...conv,
            other_user: profileRes.data,
            listing: listingRes.data as Listing | null,
            last_message: lastMsgRes.data,
            unread_count: unreadRes.count ?? 0,
          }
        })
      )

      setConversations(enriched)
      const totalUnread = enriched.reduce((s, c) => s + c.unread_count, 0)
      setUnreadMessages(totalUnread)
      setLoading(false)
    }

    loadConversations()
  }, [user, setUnreadMessages])

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId || !user) return
    const supabase = createClient()

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId!)
        .order('created_at', { ascending: true })

      setMessages((data ?? []) as Message[])
      setTimeout(scrollToBottom, 100)

      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', activeConvId!)
        .neq('sender_id', user!.id)
        .is('read_at', null)

      // Update unread count in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, unread_count: 0 } : c
        )
      )
    }

    loadMessages()

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
          setTimeout(scrollToBottom, 100)

          // Auto-mark as read if from other person
          if (newMsg.sender_id !== user!.id) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConvId, user, scrollToBottom])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !activeConvId || !user) return

    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConvId,
      sender_id: user.id,
      content: newMessage.trim(),
    })

    if (error) {
      toast.error('Failed to send message')
    } else {
      setNewMessage('')
    }
    setSending(false)
  }

  const activeConv = conversations.find((c) => c.id === activeConvId)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex w-full overflow-hidden rounded-xl border border-border bg-card">
        {/* Conversation list */}
        <div
          className={`w-full shrink-0 border-r border-border sm:w-80 ${
            activeConvId ? 'hidden sm:block' : ''
          }`}
        >
          <div className="border-b border-border p-4">
            <h1 className="font-display text-lg font-bold text-foreground">
              Messages
            </h1>
          </div>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <MessageSquare className="size-10 text-muted-foreground" />
              <p className="font-body text-sm text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConvId
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`flex w-full items-center gap-3 border-b border-border p-3 text-left transition-colors hover:bg-surface ${
                      isActive ? 'bg-surface' : ''
                    }`}
                  >
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage
                        src={conv.other_user?.avatar_url || undefined}
                        crossOrigin="anonymous"
                      />
                      <AvatarFallback className="bg-primary/20 font-body text-xs text-primary">
                        {conv.other_user?.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-body text-sm font-medium text-foreground">
                          {conv.other_user?.display_name ||
                            conv.other_user?.full_name ||
                            'User'}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="size-5 shrink-0 rounded-full p-0 text-[10px]">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate font-body text-xs text-muted-foreground">
                        {conv.listing?.title || 'Listing'}
                      </p>
                      {conv.last_message && (
                        <p className="truncate font-body text-xs text-muted-foreground">
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Message area */}
        <div
          className={`flex flex-1 flex-col ${
            activeConvId ? '' : 'hidden sm:flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  onClick={() => setActiveConvId(null)}
                >
                  <ArrowLeft className="size-5" />
                </Button>
                <Avatar className="size-8">
                  <AvatarImage
                    src={activeConv.other_user?.avatar_url || undefined}
                    crossOrigin="anonymous"
                  />
                  <AvatarFallback className="bg-primary/20 font-body text-xs text-primary">
                    {activeConv.other_user?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-medium text-foreground">
                    {activeConv.other_user?.display_name ||
                      activeConv.other_user?.full_name ||
                      'User'}
                  </p>
                  {activeConv.listing && (
                    <Link
                      href={`/listings/${activeConv.listing.id}`}
                      className="flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-primary"
                    >
                      {activeConv.listing.title}
                      <ExternalLink className="size-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isMine
                              ? 'bg-primary text-white'
                              : 'bg-surface text-foreground'
                          }`}
                        >
                          <p className="whitespace-pre-wrap font-body text-sm">
                            {msg.content}
                          </p>
                          <p
                            className={`mt-1 font-body text-[10px] ${
                              isMine ? 'text-white/60' : 'text-muted-foreground'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString(
                              'en-US',
                              { hour: 'numeric', minute: '2-digit' }
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-border p-4"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 font-body"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <MessageSquare className="size-12 text-muted-foreground" />
              <p className="font-display text-lg font-semibold text-foreground">
                Select a conversation
              </p>
              <p className="font-body text-sm text-muted-foreground">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
