'use client'

import { ChatAvatar } from '../_shared/ChatAvatar'
import { MobileBottomTabs } from '../_shared/MobileBottomTabs'
import { SparkleIcon, XIcon } from '../_shared/icons'
import {
  AttachedFile,
  AttachedListingCard,
  AttachedRFQCard,
  AttachedRFQCounter,
  ChatComposer,
  MsgBubble,
  MsgRow,
  SmartReplies,
} from './MessagesShared'
import {
  M_ACTIVE_HEADER,
  M_FILTERS,
  M_MESSAGES,
  M_SMART_REPLIES,
  M_THREADS,
  type Thread,
} from './messages-data'

export function MobileMessagesInbox() {
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#F7F9FC', paddingTop: 44 }}
    >
      <div style={{ height: 8 }} className="shrink-0" />

      <div
        className="px-4 pt-3 pb-2.5 shrink-0"
        style={{ background: '#0B2545', color: '#fff' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center font-bold size-9"
            style={{
              background: '#FF6B2B',
              color: '#fff',
              borderRadius: 10,
              fontSize: 14,
              fontFamily: 'var(--mg-font-display)',
            }}
          >
            JD
          </div>
          <h1
            className="text-[18px] font-bold"
            style={{
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.015em',
            }}
          >
            Messages
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="size-9 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 999 }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            <button
              type="button"
              className="size-9 flex items-center justify-center"
              style={{ background: '#FF6B2B', borderRadius: 999 }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3 -mx-1 overflow-x-auto">
          {M_FILTERS.slice(0, 5).map((f, i) => (
            <button
              key={f.key}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 h-7 text-[11.5px] font-semibold whitespace-nowrap shrink-0"
              style={{
                background: i === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.10)',
                color: i === 0 ? '#0A1628' : '#fff',
                borderRadius: 999,
              }}
            >
              {f.label}
              <span
                className="text-[9.5px] font-bold"
                style={{ opacity: 0.6, fontFamily: 'var(--mg-font-mono)' }}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="px-4 py-3 flex items-center gap-3 overflow-x-auto shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
      >
        {M_THREADS.slice(0, 6)
          .filter((t) => t.online)
          .map((t) => (
            <div
              key={t.id}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="relative">
                <div
                  style={{
                    padding: 2,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg,#FF6B2B,#FFB37A)',
                  }}
                >
                  <ChatAvatar tag={t.tag} color={t.avatarColor} size={48} />
                </div>
                <span
                  className="absolute right-0 bottom-0 size-3 rounded-full"
                  style={{ background: '#22C55E', border: '2px solid #fff' }}
                />
              </div>
              <span
                className="text-[10.5px] font-semibold truncate max-w-[60px]"
                style={{ color: '#0A1628' }}
              >
                {t.name.split(' ')[0]}
              </span>
            </div>
          ))}
      </div>

      <div
        className="flex-1 overflow-y-auto [&>*]:shrink-0"
        style={{ background: '#FFFFFF' }}
      >
        <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#94A3B8">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" />
          </svg>
          <span
            className="text-[10px] font-bold uppercase"
            style={{
              color: '#94A3B8',
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            Pinned
          </span>
        </div>
        {M_THREADS.filter((t) => t.pinned).map((t) => (
          <MobileThreadRow key={t.id} t={t} />
        ))}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold uppercase"
            style={{
              color: '#94A3B8',
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            Recent
          </span>
        </div>
        {M_THREADS.filter((t) => !t.pinned)
          .slice(0, 6)
          .map((t) => (
            <MobileThreadRow key={t.id} t={t} />
          ))}
      </div>

      <MobileBottomTabs active="messages" />
    </div>
  )
}

function MobileThreadRow({ t }: { t: Thread }) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 px-4 py-2.5 w-full text-left"
    >
      <ChatAvatar tag={t.tag} color={t.avatarColor} size={48} online={t.online} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[14px] font-bold truncate"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            {t.name}
          </span>
          {t.verified && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
            </svg>
          )}
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
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="text-[10.5px]"
          style={{
            color: t.unread ? '#FF6B2B' : '#94A3B8',
            fontFamily: 'var(--mg-font-mono)',
            fontWeight: t.unread ? 700 : 500,
          }}
        >
          {t.when}
        </span>
        {t.unread > 0 && (
          <span
            className="size-4 flex items-center justify-center text-[9.5px] font-bold"
            style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
          >
            {t.unread}
          </span>
        )}
      </div>
    </button>
  )
}

export function MobileMessagesThread() {
  const h = M_ACTIVE_HEADER
  const m1 = M_MESSAGES[0]
  const m2 = M_MESSAGES[1]
  const m3 = M_MESSAGES[2]
  const m5 = M_MESSAGES[4]
  const m7 = M_MESSAGES[6]
  const m8 = M_MESSAGES[7]
  const m9 = M_MESSAGES[8]
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#F7F9FC', paddingTop: 44 }}
    >
      <div style={{ height: 8 }} className="shrink-0" />
      <header
        className="flex items-center gap-2 px-3 pt-2 pb-2.5 shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
      >
        <button
          type="button"
          className="size-9 flex items-center justify-center"
          style={{ color: '#0B2545' }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <ChatAvatar tag={h.tag} color={h.avatarColor} size={36} online={h.online} />
        <div className="flex-1 min-w-0">
          <div
            className="text-[13.5px] font-bold truncate"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            {h.name}
          </div>
          <div
            className="text-[10.5px] font-semibold"
            style={{ color: '#22C55E' }}
          >
            {h.lastSeen}
          </div>
        </div>
        <button
          type="button"
          className="size-9 flex items-center justify-center"
          style={{ color: '#5A6B82' }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </header>

      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{
          background: 'rgba(14,165,233,0.06)',
          borderBottom: '1px solid #E5E9EF',
        }}
      >
        <span
          className="text-[9px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center shrink-0"
          style={{
            background: 'rgba(14,165,233,0.14)',
            color: '#0EA5E9',
            borderRadius: 3,
            letterSpacing: '0.06em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          RE: LISTING
        </span>
        <span
          className="text-[11.5px] font-bold truncate"
          style={{ color: '#0A1628' }}
        >
          {h.context.title}
        </span>
        <span
          className="text-[10px] shrink-0"
          style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
        >
          {h.context.price}
        </span>
      </div>

      <div className="flex-1 px-3 py-3 flex flex-col gap-2 overflow-y-auto [&>*]:shrink-0">
        <div className="flex items-center gap-2 my-1">
          <div className="flex-1" style={{ height: 1, background: '#E5E9EF' }} />
          <span
            className="text-[9.5px] font-bold uppercase"
            style={{
              color: '#94A3B8',
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            Today · 10:42
          </span>
          <div className="flex-1" style={{ height: 1, background: '#E5E9EF' }} />
        </div>

        {m1.kind === 'text' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={26} />}
          >
            <MsgBubble from="them" dense>
              {m1.body}
            </MsgBubble>
          </MsgRow>
        )}

        {m2.kind === 'text' && (
          <MsgRow from="me">
            <MsgBubble from="me" dense>
              {m2.body}
            </MsgBubble>
          </MsgRow>
        )}
        {m3.kind === 'listing-card' && (
          <MsgRow from="me" when="10:44" read>
            <AttachedListingCard listing={m3.listing} mine />
          </MsgRow>
        )}

        {m5.kind === 'file' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={26} />}
          >
            <AttachedFile file={m5.file} mine={false} />
          </MsgRow>
        )}

        {m7.kind === 'rfq-card' && (
          <MsgRow from="me" when="10:51" read>
            <AttachedRFQCard rfq={m7.rfq} mine />
          </MsgRow>
        )}

        {m8.kind === 'rfq-counter' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={26} />}
            when="11:02"
          >
            <AttachedRFQCounter rfq={m8.rfq} />
          </MsgRow>
        )}

        {m9.kind === 'text' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={26} />}
            showAvatar={false}
          >
            <MsgBubble from="them" dense>
              {m9.body}
            </MsgBubble>
          </MsgRow>
        )}
      </div>

      <div
        className="px-3 pt-2 pb-3 flex flex-col gap-2 shrink-0"
        style={{ background: '#F7F9FC', borderTop: '1px solid #E5E9EF' }}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <SmartReplies replies={M_SMART_REPLIES} dense />
        </div>
        <ChatComposer compact />
      </div>
    </div>
  )
}

export function MobileMessagesCompose() {
  const recents = M_THREADS.slice(0, 6)
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#FFFFFF', paddingTop: 44 }}
    >
      <div style={{ height: 8 }} className="shrink-0" />
      <header
        className="flex items-center gap-2 px-3 pt-2 pb-2.5 shrink-0"
        style={{ borderBottom: '1px solid #E5E9EF' }}
      >
        <button
          type="button"
          className="size-9 flex items-center justify-center"
          style={{ color: '#0B2545' }}
        >
          <XIcon size={18} />
        </button>
        <h1
          className="text-[15px] font-bold"
          style={{
            color: '#0A1628',
            fontFamily: 'var(--mg-font-display)',
            letterSpacing: '-0.01em',
          }}
        >
          New message
        </h1>
        <button
          type="button"
          className="ml-auto h-8 px-3 text-[12px] font-bold"
          style={{
            background: '#0B2545',
            color: '#fff',
            borderRadius: 999,
            opacity: 0.4,
          }}
        >
          Send
        </button>
      </header>

      <div
        className="px-3 py-2.5 flex items-center gap-2 flex-wrap shrink-0"
        style={{ borderBottom: '1px solid #E5E9EF' }}
      >
        <span
          className="text-[11.5px] font-bold uppercase"
          style={{
            color: '#94A3B8',
            letterSpacing: '0.06em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          To:
        </span>
        <span
          className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2 text-[12.5px] font-semibold shrink-0"
          style={{
            background: 'rgba(11,37,69,0.06)',
            color: '#0A1628',
            borderRadius: 999,
          }}
        >
          <span
            className="size-5 flex items-center justify-center text-[9px] font-bold"
            style={{ background: '#1877F2', color: '#fff', borderRadius: 999 }}
          >
            BG
          </span>
          Bayou Industrial Group
          <button type="button" style={{ color: '#94A3B8' }}>
            <XIcon size={11} />
          </button>
        </span>
        <input
          placeholder="Add another…"
          className="flex-1 min-w-[120px] outline-none text-[13px] py-1"
          style={{ color: '#0A1628' }}
        />
      </div>

      <div
        className="px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid #E5E9EF' }}
      >
        <div
          className="text-[10.5px] font-bold uppercase mb-1.5"
          style={{
            color: '#94A3B8',
            letterSpacing: '0.06em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          Attach context
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1">
          {[
            { label: 'Listing', color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' },
            { label: 'SOS', color: '#FF6B2B', bg: 'rgba(255,107,43,0.10)' },
            { label: 'RFQ', color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
            { label: 'File', color: '#5A6B82', bg: '#F0F3F7' },
          ].map((c, i) => (
            <button
              key={i}
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-bold whitespace-nowrap shrink-0"
              style={{
                background: c.bg,
                color: c.color,
                borderRadius: 999,
                letterSpacing: '0.02em',
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [&>*]:shrink-0">
        <div className="px-3 pt-3 pb-1 flex items-center gap-1.5">
          <SparkleIcon size={11} style={{ color: '#FF6B2B' }} />
          <span
            className="text-[10px] font-bold uppercase"
            style={{
              color: '#0A1628',
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            Suggested · responded recently
          </span>
        </div>
        {recents.map((t) => (
          <button
            key={t.id}
            type="button"
            className="flex items-center gap-3 px-3 py-2 w-full text-left"
          >
            <ChatAvatar tag={t.tag} color={t.avatarColor} size={36} online={t.online} />
            <div className="flex-1 min-w-0">
              <div
                className="text-[13px] font-bold truncate"
                style={{ color: '#0A1628' }}
              >
                {t.name}
              </div>
              <div className="text-[11px] truncate" style={{ color: '#5A6B82' }}>
                {t.sub}
              </div>
            </div>
            {t.verified && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div
        className="px-3 pt-2 pb-3 shrink-0"
        style={{ background: '#F7F9FC', borderTop: '1px solid #E5E9EF' }}
      >
        <ChatComposer compact />
      </div>
    </div>
  )
}
