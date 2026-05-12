import type { ReactNode } from 'react'
import { PHOTO_BG } from '../_shared/listings-data'
import { ChatAvatar } from '../_shared/ChatAvatar'
import { PhotoIcon, SparkleIcon, XIcon } from '../_shared/icons'
import type {
  FileData,
  ListingCardData,
  RFQCounterData,
  RFQData,
  Thread,
} from './messages-data'

export function MsgBubble({
  from,
  children,
  tail = true,
  dense = false,
}: {
  from: 'me' | 'them'
  children: ReactNode
  tail?: boolean
  dense?: boolean
}) {
  const isMe = from === 'me'
  return (
    <div
      className={`max-w-[78%] ${isMe ? 'self-end' : 'self-start'} shrink-0`}
      style={{
        background: isMe ? '#0B2545' : '#FFFFFF',
        color: isMe ? '#fff' : '#0A1628',
        padding: dense ? '8px 12px' : '10px 14px',
        borderRadius: 18,
        borderTopRightRadius: isMe && tail ? 6 : 18,
        borderTopLeftRadius: !isMe && tail ? 6 : 18,
        boxShadow: isMe ? 'none' : '0 1px 2px rgba(11,37,69,0.04)',
        fontSize: 13.5,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  )
}

export function MsgRow({
  from,
  avatar,
  when,
  read,
  children,
  showAvatar = true,
}: {
  from: 'me' | 'them'
  avatar?: ReactNode
  when?: string
  read?: boolean
  children: ReactNode
  showAvatar?: boolean
}) {
  const isMe = from === 'me'
  return (
    <div className={`flex gap-2 shrink-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && showAvatar && avatar}
      {!isMe && !showAvatar && <div style={{ width: 32 }} />}
      <div
        className={`flex flex-col gap-1 min-w-0 ${isMe ? 'items-end' : 'items-start'}`}
      >
        {children}
        {when && (
          <div
            className="flex items-center gap-1 px-1 text-[10.5px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {when}
            {isMe && read && (
              <span className="inline-flex items-center gap-0.5">
                ·{' '}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3D9BD6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ color: '#3D9BD6' }}>read</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function AttachedListingCard({
  listing,
  mine,
}: {
  listing: ListingCardData
  mine: boolean
}) {
  return (
    <div
      className="flex gap-3 p-2.5"
      style={{
        background: mine ? 'rgba(255,255,255,0.10)' : '#FFFFFF',
        border: mine ? '1px solid rgba(255,255,255,0.18)' : '1px solid #E5E9EF',
        borderRadius: 14,
        width: 320,
        color: mine ? '#fff' : '#0A1628',
        boxShadow: mine ? 'none' : '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <div
        className="shrink-0"
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          background: PHOTO_BG[listing.bg],
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="text-[9.5px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
            style={{
              background: mine ? 'rgba(14,165,233,0.30)' : 'rgba(14,165,233,0.10)',
              color: mine ? '#9DDCF7' : '#0EA5E9',
              borderRadius: 4,
              letterSpacing: '0.06em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            LISTING
          </span>
          <span
            className="text-[10px] font-bold"
            style={{
              color: mine ? 'rgba(255,255,255,0.6)' : '#94A3B8',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {listing.id}
          </span>
        </div>
        <div
          className="text-[12.5px] font-bold leading-tight truncate"
          style={{ fontFamily: 'var(--mg-font-display)' }}
        >
          {listing.title}
        </div>
        <div
          className="text-[11px] mt-0.5 truncate"
          style={{ opacity: mine ? 0.7 : 0.6 }}
        >
          {listing.condition} · {listing.location}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span
            className="text-[14px] font-bold"
            style={{ fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.01em' }}
          >
            ${listing.price.toLocaleString()}
          </span>
          <button
            type="button"
            className="h-6 px-2 text-[11px] font-bold"
            style={{
              background: mine ? 'rgba(255,255,255,0.18)' : '#0B2545',
              color: '#fff',
              borderRadius: 999,
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  )
}

export function AttachedRFQCard({ rfq, mine }: { rfq: RFQData; mine: boolean }) {
  const sent = rfq.status === 'sent'
  return (
    <div
      className="p-3"
      style={{
        background: mine ? 'rgba(255,255,255,0.10)' : '#FFFFFF',
        border: mine ? '1px solid rgba(255,255,255,0.18)' : '1px solid #E5E9EF',
        borderRadius: 14,
        width: 280,
        color: mine ? '#fff' : '#0A1628',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="text-[9.5px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
          style={{
            background: mine ? 'rgba(255,107,43,0.30)' : 'rgba(255,107,43,0.12)',
            color: mine ? '#FFB37A' : '#FF6B2B',
            borderRadius: 4,
            letterSpacing: '0.06em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          RFQ
        </span>
        <span
          className="text-[10.5px] font-semibold"
          style={{ opacity: mine ? 0.7 : 0.6 }}
        >
          Quote request {sent ? 'sent' : 'received'}
        </span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span
          className="text-[11px] font-semibold uppercase"
          style={{ opacity: mine ? 0.7 : 0.6, letterSpacing: '0.04em' }}
        >
          Asking
        </span>
        <span
          className="text-[20px] font-bold"
          style={{ fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.01em' }}
        >
          ${rfq.ask.toLocaleString()}
        </span>
      </div>
      <div className="text-[11.5px]" style={{ opacity: mine ? 0.7 : 0.55 }}>
        Awaiting response. Expires in 48h.
      </div>
    </div>
  )
}

export function AttachedRFQCounter({ rfq }: { rfq: RFQCounterData }) {
  return (
    <div
      className="p-3"
      style={{
        background: '#FFFFFF',
        border: '1.5px solid #FF6B2B',
        borderRadius: 14,
        width: 320,
        color: '#0A1628',
        boxShadow: '0 4px 14px rgba(255,107,43,0.12)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="text-[9.5px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
          style={{
            background: 'rgba(255,107,43,0.12)',
            color: '#FF6B2B',
            borderRadius: 4,
            letterSpacing: '0.06em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          RFQ · COUNTER
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-2.5">
        <div>
          <div
            className="text-[10.5px] font-semibold uppercase"
            style={{ color: '#94A3B8', letterSpacing: '0.04em' }}
          >
            Your ask
          </div>
          <div
            className="text-[16px] font-bold mt-0.5"
            style={{
              color: '#94A3B8',
              fontFamily: 'var(--mg-font-display)',
              textDecoration: 'line-through',
            }}
          >
            ${rfq.ask.toLocaleString()}
          </div>
        </div>
        <div>
          <div
            className="text-[10.5px] font-semibold uppercase"
            style={{ color: '#FF6B2B', letterSpacing: '0.04em' }}
          >
            Their counter
          </div>
          <div
            className="text-[20px] font-bold mt-0.5"
            style={{
              color: '#0A1628',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            ${rfq.counter.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="text-[11.5px] mb-2.5" style={{ color: '#5A6B82' }}>
        <span className="font-semibold" style={{ color: '#0A1628' }}>
          Terms:{' '}
        </span>
        {rfq.terms}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex-1 h-8 text-[12px] font-bold"
          style={{ background: '#22C55E', color: '#fff', borderRadius: 999 }}
        >
          Accept
        </button>
        <button
          type="button"
          className="flex-1 h-8 text-[12px] font-bold"
          style={{
            background: '#FFFFFF',
            color: '#0A1628',
            borderRadius: 999,
            border: '1px solid #E5E9EF',
          }}
        >
          Counter
        </button>
        <button
          type="button"
          className="size-8 flex items-center justify-center"
          style={{
            background: '#FFFFFF',
            color: '#94A3B8',
            borderRadius: 999,
            border: '1px solid #E5E9EF',
          }}
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  )
}

export function AttachedFile({ file, mine }: { file: FileData; mine: boolean }) {
  return (
    <div
      className="flex items-center gap-2.5 p-2.5"
      style={{
        background: mine ? 'rgba(255,255,255,0.10)' : '#F7F9FC',
        border: mine ? '1px solid rgba(255,255,255,0.18)' : '1px solid #E5E9EF',
        borderRadius: 12,
        width: 280,
        color: mine ? '#fff' : '#0A1628',
      }}
    >
      <div
        className="size-9 flex items-center justify-center shrink-0"
        style={{
          background: mine ? 'rgba(255,255,255,0.10)' : '#fff',
          color: '#DC2626',
          borderRadius: 8,
          border: mine ? 'none' : '1px solid #E5E9EF',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold truncate">{file.name}</div>
        <div
          className="text-[10.5px]"
          style={{
            opacity: mine ? 0.7 : 0.6,
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {file.size} · PDF
        </div>
      </div>
      <button
        type="button"
        className="size-7 flex items-center justify-center"
        style={{ opacity: 0.7 }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      </button>
    </div>
  )
}

export function SmartReplies({
  replies,
  dense = false,
}: {
  replies: string[]
  dense?: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 ${dense ? '' : 'flex-wrap'}`}>
      <span
        className={`inline-flex items-center gap-1 font-bold uppercase shrink-0 ${
          dense ? 'text-[9.5px]' : 'text-[10.5px]'
        }`}
        style={{ color: '#FF6B2B', letterSpacing: '0.08em' }}
      >
        <SparkleIcon size={dense ? 9 : 10} />
        Smart reply
      </span>
      {replies.map((r, i) => (
        <button
          key={i}
          type="button"
          className={`inline-flex items-center font-semibold whitespace-nowrap shrink-0 ${
            dense ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[12.5px]'
          }`}
          style={{
            background: '#FFFFFF',
            color: '#0A1628',
            borderRadius: 999,
            border: '1px solid #E5E9EF',
            boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
          }}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

function ComposerIconBtn({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="size-8 flex items-center justify-center"
      style={{ color: '#5A6B82', borderRadius: 999 }}
    >
      {children}
    </button>
  )
}

export function ChatComposer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="flex items-end gap-2 p-2"
      style={{
        background: '#FFFFFF',
        borderRadius: compact ? 999 : 16,
        border: '1px solid #E5E9EF',
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <div className="flex items-center gap-0.5 pl-1 pb-1">
        <ComposerIconBtn>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
        </ComposerIconBtn>
        {!compact && (
          <ComposerIconBtn>
            <PhotoIcon size={16} />
          </ComposerIconBtn>
        )}
        {!compact && (
          <ComposerIconBtn>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </ComposerIconBtn>
        )}
      </div>
      <textarea
        rows={1}
        placeholder="Message Marcus…"
        className="flex-1 outline-none resize-none py-2 text-[13.5px] bg-transparent"
        style={{ color: '#0A1628', minHeight: 24, maxHeight: 100 }}
      />
      <button
        type="button"
        className="size-9 flex items-center justify-center shrink-0"
        style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2 11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  )
}

export function ThreadRow({
  t,
  active,
  onClick,
}: {
  t: Thread
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 w-full text-left shrink-0"
      style={{
        background: active ? 'rgba(11,37,69,0.06)' : 'transparent',
        borderRadius: 12,
      }}
    >
      <ChatAvatar tag={t.tag} color={t.avatarColor} size={44} online={t.online} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[13.5px] font-bold truncate"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            {t.name}
          </span>
          {t.verified && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
            </svg>
          )}
          <span
            className="ml-auto text-[10.5px] shrink-0"
            style={{
              color: t.unread ? '#FF6B2B' : '#94A3B8',
              fontFamily: 'var(--mg-font-mono)',
              fontWeight: t.unread ? 700 : 500,
            }}
          >
            {t.when}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {t.badge && (
            <span
              className="text-[9px] font-bold uppercase px-1.5 h-[14px] inline-flex items-center shrink-0"
              style={{
                background: `${t.badge.color}1A`,
                color: t.badge.color,
                borderRadius: 3,
                letterSpacing: '0.06em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              {t.badge.label}
            </span>
          )}
          <span
            className="text-[12px] truncate"
            style={{
              color: t.unread ? '#0A1628' : '#5A6B82',
              fontWeight: t.unread ? 600 : 400,
            }}
          >
            {t.last}
          </span>
        </div>
      </div>
      {t.unread > 0 && (
        <span
          className="size-5 flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          {t.unread}
        </span>
      )}
    </button>
  )
}
