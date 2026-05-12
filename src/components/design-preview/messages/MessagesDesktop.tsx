'use client'

import { useState } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import { ChatAvatar } from '../_shared/ChatAvatar'
import {
  AttachedFile,
  AttachedListingCard,
  AttachedRFQCard,
  AttachedRFQCounter,
  ChatComposer,
  MsgBubble,
  MsgRow,
  SmartReplies,
  ThreadRow,
} from './MessagesShared'
import {
  M_ACTIVE_HEADER,
  M_FILTERS,
  M_MESSAGES,
  M_SMART_REPLIES,
  M_THREADS,
} from './messages-data'

export function MessagesDesktop() {
  return (
    <div
      style={{
        width: '100%',
        minHeight: 800,
        background: '#F0F2F5',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <ModernHeader />
      <div className="flex-1 flex justify-center px-6 py-5 overflow-hidden">
        <div
          className="flex"
          style={{
            width: '100%',
            maxWidth: 1320,
            background: '#FFFFFF',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow:
              '0 1px 2px rgba(11,37,69,0.04), 0 8px 24px rgba(11,37,69,0.06)',
            border: '1px solid #E5E9EF',
          }}
        >
          <MessagesInboxRail />
          <MessagesThreadPanel />
        </div>
      </div>
    </div>
  )
}

function MessagesInboxRail() {
  const [filter, setFilter] = useState('all')
  const [activeId, setActiveId] = useState('t1')
  return (
    <aside
      className="flex flex-col shrink-0"
      style={{ width: 380, borderRight: '1px solid #E5E9EF', background: '#FFFFFF' }}
    >
      <div
        className="px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '1px solid #E5E9EF' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <h1
            className="text-[22px] font-bold"
            style={{
              fontFamily: 'var(--mg-font-display)',
              color: '#0A1628',
              letterSpacing: '-0.015em',
            }}
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
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            4 NEW
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="size-8 flex items-center justify-center"
              style={{ color: '#5A6B82' }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
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
              className="size-8 flex items-center justify-center"
              style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
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
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 -mx-1 overflow-x-auto">
          {M_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="inline-flex items-center gap-1.5 px-2.5 h-7 text-[12px] font-semibold whitespace-nowrap shrink-0"
              style={{
                background: filter === f.key ? '#0B2545' : 'transparent',
                color: filter === f.key ? '#FFFFFF' : '#5A6B82',
                borderRadius: 999,
              }}
            >
              {f.label}
              <span
                className="text-[10px] font-bold"
                style={{
                  opacity: filter === f.key ? 0.7 : 0.6,
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 [&>*]:shrink-0">
        <div className="px-2 pt-1 pb-1 flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#94A3B8">
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
          <ThreadRow
            key={t.id}
            t={t}
            active={t.id === activeId}
            onClick={() => setActiveId(t.id)}
          />
        ))}
        <div className="px-2 pt-3 pb-1 flex items-center gap-1.5">
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
        {M_THREADS.filter((t) => !t.pinned).map((t) => (
          <ThreadRow
            key={t.id}
            t={t}
            active={t.id === activeId}
            onClick={() => setActiveId(t.id)}
          />
        ))}
      </div>

      <div
        className="flex items-center gap-2.5 px-3 py-2.5 shrink-0"
        style={{ borderTop: '1px solid #E5E9EF', background: '#FAFBFC' }}
      >
        <ChatAvatar tag="JD" color="#0B2545" size={32} online />
        <div className="flex-1 min-w-0">
          <div
            className="text-[12.5px] font-bold truncate"
            style={{ color: '#0A1628' }}
          >
            Jordan Devereaux
          </div>
          <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
            Active · auto-reply off
          </div>
        </div>
        <button
          type="button"
          className="size-7 flex items-center justify-center"
          style={{ color: '#5A6B82' }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

function MessagesThreadPanel() {
  const h = M_ACTIVE_HEADER
  // Pull out each message under its narrowed type so the JSX below stays clean.
  const m1 = M_MESSAGES[0]
  const m2 = M_MESSAGES[1]
  const m3 = M_MESSAGES[2]
  const m4 = M_MESSAGES[3]
  const m5 = M_MESSAGES[4]
  const m6 = M_MESSAGES[5]
  const m7 = M_MESSAGES[6]
  const m8 = M_MESSAGES[7]
  const m9 = M_MESSAGES[8]
  return (
    <section
      className="flex-1 flex flex-col"
      style={{ background: '#F7F9FC', minWidth: 0 }}
    >
      <header
        className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
      >
        <ChatAvatar tag={h.tag} color={h.avatarColor} size={42} online={h.online} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[15px] font-bold truncate"
              style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
            >
              {h.name}
            </span>
            <span className="size-1 rounded-full" style={{ background: '#94A3B8' }} />
            <span className="text-[11.5px] font-semibold" style={{ color: '#22C55E' }}>
              {h.lastSeen}
            </span>
          </div>
          <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
            {h.sub}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              className="size-9 flex items-center justify-center"
              style={{
                background: '#F0F3F7',
                color: '#5A6B82',
                borderRadius: 999,
              }}
            >
              {i === 0 ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              ) : i === 1 ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
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
              )}
            </button>
          ))}
        </div>
      </header>

      <div
        className="flex items-center gap-3 px-5 py-2.5 shrink-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(14,165,233,0.06), rgba(14,165,233,0.02))',
          borderBottom: '1px solid #E5E9EF',
        }}
      >
        <span
          className="text-[9.5px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center shrink-0"
          style={{
            background: 'rgba(14,165,233,0.12)',
            color: '#0EA5E9',
            borderRadius: 4,
            letterSpacing: '0.06em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          RE: LISTING
        </span>
        <span
          className="text-[12.5px] font-bold truncate"
          style={{ color: '#0A1628' }}
        >
          {h.context.title}
        </span>
        <span
          className="text-[10.5px]"
          style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
        >
          · {h.context.id} · {h.context.price}
        </span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-semibold shrink-0"
          style={{
            background: '#FFFFFF',
            color: '#0A1628',
            borderRadius: 999,
            border: '1px solid #E5E9EF',
          }}
        >
          Open listing{' '}
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
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-2.5 overflow-y-auto [&>*]:shrink-0">
        <DateDivider label="Today · 10:42 AM" />

        {m1.kind === 'text' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={28} />}
          >
            <MsgBubble from="them">{m1.body}</MsgBubble>
          </MsgRow>
        )}

        {m2.kind === 'text' && (
          <MsgRow from="me">
            <MsgBubble from="me">{m2.body}</MsgBubble>
          </MsgRow>
        )}
        {m3.kind === 'listing-card' && (
          <MsgRow from="me" when={m3.when} read={m3.read}>
            <AttachedListingCard listing={m3.listing} mine />
          </MsgRow>
        )}

        {m4.kind === 'text' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={28} />}
          >
            <MsgBubble from="them">{m4.body}</MsgBubble>
          </MsgRow>
        )}
        {m5.kind === 'file' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={28} />}
            when={m5.when}
            showAvatar={false}
          >
            <AttachedFile file={m5.file} mine={false} />
          </MsgRow>
        )}

        {m6.kind === 'text' && (
          <MsgRow from="me">
            <MsgBubble from="me">{m6.body}</MsgBubble>
          </MsgRow>
        )}
        {m7.kind === 'rfq-card' && (
          <MsgRow from="me" when={m7.when} read={m7.read}>
            <AttachedRFQCard rfq={m7.rfq} mine />
          </MsgRow>
        )}

        {m8.kind === 'rfq-counter' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={28} />}
            when={m8.when}
          >
            <AttachedRFQCounter rfq={m8.rfq} />
          </MsgRow>
        )}

        {m9.kind === 'text' && (
          <MsgRow
            from="them"
            avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={28} />}
            when={m9.when}
            showAvatar={false}
          >
            <MsgBubble from="them">{m9.body}</MsgBubble>
          </MsgRow>
        )}

        <MsgRow
          from="them"
          avatar={<ChatAvatar tag={h.tag} color={h.avatarColor} size={28} />}
        >
          <div
            className="inline-flex items-center gap-1 px-3.5 py-2.5"
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              borderTopLeftRadius: 6,
              boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
            }}
          >
            <span className="mg-typing-dot" />
            <span className="mg-typing-dot" style={{ animationDelay: '0.18s' }} />
            <span className="mg-typing-dot" style={{ animationDelay: '0.36s' }} />
          </div>
        </MsgRow>
      </div>

      <div
        className="px-5 pt-2.5 pb-4 flex flex-col gap-2.5 shrink-0"
        style={{ background: '#F7F9FC', borderTop: '1px solid #E5E9EF' }}
      >
        <SmartReplies replies={M_SMART_REPLIES} />
        <ChatComposer />
      </div>
    </section>
  )
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1" style={{ height: 1, background: '#E5E9EF' }} />
      <span
        className="text-[10.5px] font-bold uppercase"
        style={{
          color: '#94A3B8',
          letterSpacing: '0.08em',
          fontFamily: 'var(--mg-font-mono)',
        }}
      >
        {label}
      </span>
      <div className="flex-1" style={{ height: 1, background: '#E5E9EF' }} />
    </div>
  )
}
