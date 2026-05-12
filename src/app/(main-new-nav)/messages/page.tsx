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
  Paperclip,
  X,
  FileText,
  Download,
  Search,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { sendMessage as sendMessageAction } from './actions'
import {
  uploadMessageAttachment,
  getMessageAttachments,
  getReplyTemplates,
  createReplyTemplate,
  deleteReplyTemplate,
  searchMessages,
} from '@/app/actions/messaging'
import type { Tables } from '@/types/database'

type Conversation = Tables<'conversations'>
type Message = Tables<'messages'>
type Profile = Tables<'profiles'>
type Listing = Tables<'listings'>
type Attachment = Tables<'message_attachments'>
type ReplyTemplate = Tables<'reply_templates'>

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

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(
    searchParams.get('conversation')
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({})
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<ReplyTemplate[]>([])
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
            (conv.buyer_id === user!.id ? conv.seller_id : conv.buyer_id) || ''

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

      const msgs = (data ?? []) as Message[]
      setMessages(msgs)
      setTimeout(scrollToBottom, 100)

      // Load attachments for these messages
      if (msgs.length > 0) {
        const result = await getMessageAttachments(msgs.map((m) => m.id))
        if (result.attachments) {
          const grouped: Record<string, Attachment[]> = {}
          for (const att of result.attachments) {
            if (!grouped[att.message_id]) grouped[att.message_id] = []
            grouped[att.message_id].push(att)
          }
          setAttachments(grouped)
        }
      }

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
          setMessages((prev) => {
            // Avoid duplicates (sender already has it from optimistic add)
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setTimeout(scrollToBottom, 100)

          // Auto-mark as read if from other person
          if (newMsg.sender_id !== user!.id) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(() => {})
          }

          // Fetch attachments for new message (may arrive after a brief delay)
          const fetchAttachments = () => {
            getMessageAttachments([newMsg.id]).then((result) => {
              if (result.attachments && result.attachments.length > 0) {
                setAttachments((prev) => {
                  const updated = { ...prev }
                  for (const att of result.attachments!) {
                    if (!updated[att.message_id]) updated[att.message_id] = []
                    if (!updated[att.message_id].some((a) => a.id === att.id)) {
                      updated[att.message_id] = [...updated[att.message_id], att]
                    }
                  }
                  return updated
                })
              }
            })
          }
          // Try immediately and again after 2s (attachment upload may still be in progress)
          fetchAttachments()
          setTimeout(fetchAttachments, 2000)
        }
      )
      .subscribe()

    // Also subscribe to new attachments for this conversation's messages
    const attachChannel = supabase
      .channel(`attachments:${activeConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments',
        },
        (payload) => {
          const newAtt = payload.new as Attachment
          // Only add if it belongs to a message in our current conversation
          setMessages((prev) => {
            const msgIds = new Set(prev.map((m) => m.id))
            if (msgIds.has(newAtt.message_id)) {
              setAttachments((prevAtt) => {
                const updated = { ...prevAtt }
                if (!updated[newAtt.message_id]) updated[newAtt.message_id] = []
                if (!updated[newAtt.message_id].some((a) => a.id === newAtt.id)) {
                  updated[newAtt.message_id] = [...updated[newAtt.message_id], newAtt]
                }
                return updated
              })
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(attachChannel)
    }
  }, [activeConvId, user, scrollToBottom])

  // Load reply templates
  useEffect(() => {
    if (!user) return
    getReplyTemplates().then((result) => {
      if (result.templates) setTemplates(result.templates)
    })
  }, [user])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if ((!newMessage.trim() && !pendingFile) || !activeConvId || !user) return

    setSending(true)

    // Send text message (use descriptive text for file-only messages)
    const content = newMessage.trim() || (pendingFile ? `Sent ${pendingFile.type.startsWith('image/') ? 'an image' : 'a file'}` : '')
    const result = await sendMessageAction(activeConvId, content)

    if (result.error) {
      toast.error(result.error)
      setSending(false)
      return
    }

    // Upload attachment if present
    if (pendingFile && result.message) {
      const formData = new FormData()
      formData.set('file', pendingFile)
      formData.set('messageId', result.message.id)
      const attachResult = await uploadMessageAttachment(formData)
      if (attachResult.error) {
        toast.error(`Attachment failed: ${attachResult.error}`)
      } else if (attachResult.attachment) {
        setAttachments((prev) => ({
          ...prev,
          [result.message!.id]: [...(prev[result.message!.id] || []), attachResult.attachment!],
        }))
      }
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    setNewMessage('')
    setSending(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB')
      return
    }
    setPendingFile(file)
  }

  function handleTemplateSelect(template: ReplyTemplate) {
    setNewMessage(template.body)
    setShowTemplates(false)
  }

  async function handleCreateTemplate() {
    if (!templateName.trim() || !templateBody.trim()) return
    const result = await createReplyTemplate(templateName, templateBody)
    if (result.error) {
      toast.error(result.error)
    } else if (result.template) {
      setTemplates((prev) => [result.template!, ...prev])
      setTemplateName('')
      setTemplateBody('')
      setShowTemplateForm(false)
      toast.success('Template saved')
    }
  }

  async function handleDeleteTemplate(id: string) {
    const result = await deleteReplyTemplate(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Template deleted')
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const result = await searchMessages(searchQuery)
    if (result.error) {
      toast.error(result.error)
    } else {
      setSearchResults(result.results || [])
    }
    setSearching(false)
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
      <div
        className="flex w-full overflow-hidden rounded-2xl bg-card"
        style={{
          boxShadow:
            '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)',
        }}
      >
        {/* Conversation list */}
        <div
          className={`w-full shrink-0 border-r border-border sm:w-80 ${
            activeConvId ? 'hidden sm:block' : ''
          }`}
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <h1
                className="font-display text-[22px] font-bold text-foreground"
                style={{ letterSpacing: '-0.015em' }}
              >
                Messages
              </h1>
              <span
                className="text-[10.5px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
                style={{
                  background: 'rgba(255,107,43,0.10)',
                  color: '#FF6B2B',
                  borderRadius: 4,
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}
              >
                Inbox
              </span>
              <div className="ml-auto"></div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchMode(!searchMode)}
                className={searchMode ? 'text-primary' : ''}
              >
                <Search className="size-4" />
              </Button>
            </div>
            {searchMode && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search messages..."
                  className="flex-1 font-body text-xs"
                />
                <Button size="sm" onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="size-3 animate-spin" /> : 'Go'}
                </Button>
              </div>
            )}
          </div>

          {/* Search results */}
          {searchMode && searchResults.length > 0 ? (
            <div className="overflow-y-auto">
              <div className="border-b border-border bg-surface/50 px-3 py-1.5">
                <p className="font-body text-[10px] font-medium uppercase text-muted-foreground">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
              </div>
              {searchResults.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setActiveConvId(msg.conversation_id)
                    setSearchMode(false)
                    setSearchResults([])
                    setSearchQuery('')
                  }}
                  className="flex w-full flex-col gap-0.5 border-b border-border p-3 text-left transition-colors hover:bg-surface"
                >
                  <p className="line-clamp-2 font-body text-xs text-foreground">
                    {msg.content}
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <MessageSquare className="size-10 text-muted-foreground" />
              <p className="font-display text-base font-semibold text-foreground">
                No messages yet
              </p>
              <p className="font-body text-sm text-muted-foreground max-w-xs">
                When you contact a seller or receive an inquiry, conversations will appear here.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 font-body">
                <Link href="/search">Browse Equipment</Link>
              </Button>
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
                    const msgAttachments = attachments[msg.id] || []
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
                          {/* Attachments */}
                          {msgAttachments.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {msgAttachments.map((att) => (
                                <AttachmentPreview
                                  key={att.id}
                                  attachment={att}
                                  isMine={isMine}
                                />
                              ))}
                            </div>
                          )}
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

              {/* Pending file preview */}
              {pendingFile && (
                <div className="flex items-center gap-2 border-t border-border bg-surface/50 px-4 py-2">
                  <Paperclip className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate font-body text-xs text-foreground">
                    {pendingFile.name}
                  </span>
                  <span className="font-body text-[10px] text-muted-foreground">
                    {(pendingFile.size / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => {
                      setPendingFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}

              {/* Template picker */}
              {showTemplates && (
                <div className="max-h-48 overflow-y-auto border-t border-border bg-surface/50">
                  <div className="flex items-center justify-between px-4 py-2">
                    <p className="font-body text-xs font-medium text-foreground">
                      Quick Reply Templates
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 font-body text-[10px]"
                      onClick={() => setShowTemplateForm(!showTemplateForm)}
                    >
                      <Plus className="mr-1 size-3" />
                      New
                    </Button>
                  </div>
                  {showTemplateForm && (
                    <div className="space-y-2 border-t border-border px-4 py-2">
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name"
                        className="h-7 font-body text-xs"
                      />
                      <Input
                        value={templateBody}
                        onChange={(e) => setTemplateBody(e.target.value)}
                        placeholder="Template body"
                        className="h-7 font-body text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-6 font-body text-[10px]"
                        onClick={handleCreateTemplate}
                      >
                        Save Template
                      </Button>
                    </div>
                  )}
                  {templates.length === 0 && !showTemplateForm ? (
                    <p className="px-4 pb-3 font-body text-xs text-muted-foreground">
                      No templates yet. Create one to quickly reply to common questions.
                    </p>
                  ) : (
                    templates.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 border-t border-border px-4 py-2 hover:bg-surface"
                      >
                        <button
                          className="flex-1 text-left"
                          onClick={() => handleTemplateSelect(t)}
                        >
                          <p className="font-body text-xs font-medium text-foreground">
                            {t.name}
                          </p>
                          <p className="truncate font-body text-[10px] text-muted-foreground">
                            {t.body}
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDeleteTemplate(t.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-border p-4"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Paperclip className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`shrink-0 ${showTemplates ? 'text-primary' : ''}`}
                  onClick={() => setShowTemplates(!showTemplates)}
                  title="Quick reply templates"
                >
                  <ChevronDown className="size-4" />
                </Button>
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
                  disabled={(!newMessage.trim() && !pendingFile) || sending}
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

function AttachmentPreview({
  attachment,
  isMine,
}: {
  attachment: Attachment
  isMine: boolean
}) {
  const isImage = attachment.file_type.startsWith('image/')
  const isPdf = attachment.file_type === 'application/pdf'
  const sizeLabel =
    attachment.file_size_bytes > 1024 * 1024
      ? `${(attachment.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(attachment.file_size_bytes / 1024).toFixed(0)} KB`

  if (isImage) {
    return (
      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg"
      >
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="max-h-48 max-w-full rounded-lg object-cover"
        />
        <span
          className={`font-body text-[10px] ${
            isMine ? 'text-white/60' : 'text-muted-foreground'
          }`}
        >
          {attachment.file_name}
        </span>
      </a>
    )
  }

  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
        isMine
          ? 'border-white/20 hover:bg-white/10'
          : 'border-border hover:bg-surface'
      }`}
    >
      {isPdf ? (
        <FileText className={`size-5 shrink-0 ${isMine ? 'text-white/80' : 'text-red-400'}`} />
      ) : (
        <FileText className={`size-5 shrink-0 ${isMine ? 'text-white/80' : 'text-blue-400'}`} />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-body text-xs ${
            isMine ? 'text-white' : 'text-foreground'
          }`}
        >
          {attachment.file_name}
        </p>
        <p
          className={`font-body text-[10px] ${
            isMine ? 'text-white/60' : 'text-muted-foreground'
          }`}
        >
          {sizeLabel}
        </p>
      </div>
      <Download
        className={`size-4 shrink-0 ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}
      />
    </a>
  )
}
