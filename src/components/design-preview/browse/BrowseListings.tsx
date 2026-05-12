'use client'

import { useState } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import { PhotoTile } from '../_shared/PhotoTile'
import { COND } from '../_shared/listings-data'
import { HeartIcon, SearchIcon } from '../_shared/icons'
import { MOCK_MARKET_LISTINGS, priceFmt } from './browse-data'

export function BrowseListings() {
  const [mapOn, setMapOn] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const rows = MOCK_MARKET_LISTINGS

  return (
    <div
      style={{
        background: '#F4F6FA',
        minHeight: '100%',
        fontFamily: 'var(--mg-font-body)',
      }}
    >
      <ModernHeader />
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1
              className="text-[28px] font-bold"
              style={{
                color: '#0A1628',
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.02em',
              }}
            >
              Browse equipment
            </h1>
            <p className="text-[13.5px] mt-1" style={{ color: '#5A6B82' }}>
              248 listings · centrifuges, pumps, separators in your radius
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 px-3 text-[13px] font-semibold flex items-center gap-1.5"
              style={{
                background: '#FFFFFF',
                color: '#0A1628',
                borderRadius: 999,
                border: '1px solid #E5E9EF',
              }}
            >
              <HeartIcon size={13} /> Save search
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#94A3B8' }}
            />
            <input
              placeholder="Search Alfa Laval, Sulzer, decanter…"
              className="h-9 pl-9 pr-3 text-[13px] outline-none w-[300px]"
              style={{
                background: '#FFFFFF',
                borderRadius: 999,
                border: '1px solid #E5E9EF',
              }}
            />
          </div>
          {[
            'Category',
            'Condition',
            'Price: Any',
            'Within 500 mi',
            'Has photos',
            'Verified sellers',
          ].map((label) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-semibold"
              style={{
                background: '#FFFFFF',
                color: '#0A1628',
                borderRadius: 999,
                border: '1px solid #E5E9EF',
              }}
            >
              {label}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ))}
          <button
            type="button"
            className="text-[12px] font-semibold ml-1"
            style={{ color: '#1877F2' }}
          >
            + Saved
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMapOn(!mapOn)}
              className="flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold"
              style={{
                background: mapOn ? '#0B2545' : '#FFFFFF',
                color: mapOn ? '#fff' : '#0A1628',
                borderRadius: 999,
                boxShadow: '0 1px 2px rgba(11,37,69,0.06)',
                border: mapOn ? 'none' : '1px solid #E5E9EF',
              }}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: mapOn ? '#22C55E' : '#94A3B8' }}
              />{' '}
              Map
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-semibold"
              style={{
                background: '#FFFFFF',
                color: '#0A1628',
                borderRadius: 999,
                border: '1px solid #E5E9EF',
              }}
            >
              Sort: Newest
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: mapOn ? '1fr 520px' : '1fr' }}
        >
          <div className="flex flex-col gap-2.5">
            {rows.map((l) => {
              const c = COND[l.condition]
              const isHovered = hovered === l.id
              return (
                <div
                  key={l.id}
                  onMouseEnter={() => setHovered(l.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex gap-4 p-3"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    boxShadow: isHovered
                      ? '0 4px 16px rgba(11,37,69,0.10)'
                      : '0 1px 2px rgba(11,37,69,0.04), 0 2px 6px rgba(11,37,69,0.04)',
                    transform: isHovered ? 'translateY(-1px)' : 'none',
                    transition: 'all 140ms ease',
                    cursor: 'pointer',
                    border: isHovered
                      ? '1px solid rgba(24,119,242,0.20)'
                      : '1px solid transparent',
                  }}
                >
                  <PhotoTile bg={l.bg} hasMedia={true} size={120} radius={12} />
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10.5px] font-bold uppercase px-2 h-[20px] inline-flex items-center gap-1"
                        style={{
                          background: `${c.color}18`,
                          color: c.color,
                          borderRadius: 999,
                          letterSpacing: '0.04em',
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: c.color }}
                        />
                        {c.label}
                      </span>
                      {l.verified && (
                        <span
                          className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center gap-1"
                          style={{
                            background: 'rgba(24,119,242,0.10)',
                            color: '#1877F2',
                            borderRadius: 999,
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
                          </svg>
                          Verified seller
                        </span>
                      )}
                      <span
                        className="ml-auto text-[11.5px]"
                        style={{
                          color: '#94A3B8',
                          fontFamily: 'var(--mg-font-mono)',
                        }}
                      >
                        {l.posted}
                      </span>
                    </div>
                    <div
                      className="text-[15px] font-bold leading-snug"
                      style={{
                        color: '#0A1628',
                        fontFamily: 'var(--mg-font-display)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {l.title}
                    </div>
                    <div className="text-[12.5px] mt-1" style={{ color: '#5A6B82' }}>
                      {l.category} · {l.location} · {l.distance} mi away
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-7 flex items-center justify-center font-bold text-[10px]"
                          style={{
                            background: '#94A3B8',
                            color: '#fff',
                            borderRadius: 999,
                          }}
                        >
                          {l.seller
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div
                            className="text-[12px] font-semibold"
                            style={{ color: '#0A1628' }}
                          >
                            {l.seller}
                          </div>
                          <div className="text-[11px]" style={{ color: '#5A6B82' }}>
                            ★ {l.sellerRating}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div
                            className="text-[18px] font-bold"
                            style={{
                              color: '#0A1628',
                              fontFamily: 'var(--mg-font-display)',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {priceFmt(l)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="size-9 flex items-center justify-center"
                          style={{
                            background: l.faved
                              ? 'rgba(220,38,38,0.10)'
                              : '#F0F3F7',
                            color: l.faved ? '#DC2626' : '#5A6B82',
                            borderRadius: 999,
                          }}
                        >
                          <HeartIcon size={15} fill={l.faved ? '#DC2626' : 'none'} />
                        </button>
                        <button
                          type="button"
                          className="h-9 px-4 text-[12.5px] font-bold"
                          style={{
                            background: '#0B2545',
                            color: '#fff',
                            borderRadius: 999,
                          }}
                        >
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {mapOn && (
            <div
              className="sticky top-4 self-start relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #E8F0FA 0%, #F0F4FA 100%)',
                borderRadius: 16,
                height: 720,
                boxShadow:
                  '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(11,37,69,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,37,69,0.04) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              <svg
                viewBox="0 0 100 80"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M10,30 L20,25 L35,22 L50,20 L70,22 L85,28 L92,40 L88,55 L80,65 L70,68 L55,70 L40,68 L25,65 L15,55 L8,42 Z"
                  fill="rgba(11,37,69,0.06)"
                  stroke="rgba(11,37,69,0.15)"
                  strokeWidth="0.3"
                />
              </svg>
              {rows.map((p) => {
                const isHovered = hovered === p.id
                return (
                  <div
                    key={p.id}
                    className="absolute"
                    style={{
                      left: `${p.pinX}%`,
                      top: `${p.pinY}%`,
                      transform: 'translate(-50%,-100%)',
                      zIndex: isHovered ? 10 : 1,
                    }}
                  >
                    <div
                      className="px-2.5 h-8 flex items-center gap-1.5 text-[12.5px] font-bold whitespace-nowrap"
                      style={{
                        background: isHovered ? '#0B2545' : '#FFFFFF',
                        color: isHovered ? '#fff' : '#0A1628',
                        borderRadius: 999,
                        boxShadow: isHovered
                          ? '0 8px 20px rgba(0,0,0,0.20)'
                          : '0 2px 8px rgba(0,0,0,0.10)',
                        transform: isHovered ? 'scale(1.10)' : 'scale(1)',
                        transition: 'all 140ms ease',
                        border: isHovered ? '2px solid #FF6B2B' : '2px solid #fff',
                      }}
                    >
                      {priceFmt(p)}
                    </div>
                  </div>
                )
              })}
              <div
                className="absolute top-3 left-3 px-3 py-1.5 text-[12px] font-semibold flex items-center gap-2"
                style={{
                  background: '#FFFFFF',
                  color: '#0A1628',
                  borderRadius: 999,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: '#22C55E' }}
                />
                {rows.length} of 248 in view
              </div>
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {['+', '−'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="size-9 flex items-center justify-center text-[18px] font-bold"
                    style={{
                      background: '#FFFFFF',
                      color: '#0A1628',
                      borderRadius: 10,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
