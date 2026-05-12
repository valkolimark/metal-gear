import { ModernHeader } from '../_shared/ModernHeader'
import {
  ArrowRightIcon,
  BookmarkIcon,
  ClockIcon,
  FlameIcon,
  SearchIcon,
  SparkleIcon,
  StoreIcon,
  TrendingIcon,
  XIcon,
} from '../_shared/icons'
import {
  QUICK_CATEGORIES,
  RECENT_SEARCHES,
  SAVED_SEARCHES,
  TRENDING_QUERIES,
} from './search-data'

export function SearchEntry() {
  return (
    <div
      style={{
        background: '#F4F6FA',
        minHeight: '100%',
        fontFamily: 'var(--mg-font-body)',
      }}
    >
      <ModernHeader />
      <div className="max-w-[1100px] mx-auto px-6 pt-10 pb-12">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 mb-3 px-3 h-[26px]"
            style={{ background: 'rgba(11,37,69,0.06)', color: '#0A1628', borderRadius: 999 }}
          >
            <SparkleIcon size={12} />
            <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: '0.08em' }}>
              Smart search · beta
            </span>
          </div>
          <h1
            className="text-[36px] font-bold"
            style={{
              color: '#0A1628',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.025em',
            }}
          >
            What are you looking for?
          </h1>
          <p className="text-[14px] mt-2" style={{ color: '#5A6B82' }}>
            Search across listings, companies, people, SOS posts, and feed. Try writing the way
            you&apos;d say it out loud.
          </p>
        </div>

        <div className="relative mb-2">
          <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
            <SearchIcon size={20} />
          </div>
          <input
            placeholder="e.g. decanter under $50k near Houston, verified sellers"
            className="w-full h-[60px] pl-14 pr-[140px] text-[16px] outline-none"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E5E9EF',
              boxShadow: '0 1px 2px rgba(11,37,69,0.04), 0 8px 24px rgba(11,37,69,0.06)',
            }}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-[44px] px-5 text-[13.5px] font-bold flex items-center gap-1.5"
            style={{ background: '#0B2545', color: '#fff', borderRadius: 12 }}
          >
            Search <ArrowRightIcon size={14} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 px-1 mb-8 text-[11.5px]" style={{ color: '#5A6B82' }}>
          <span style={{ fontFamily: 'var(--mg-font-mono)' }}>⌘K</span>
          <span>opens search anywhere</span>
          <span className="mx-1.5">·</span>
          <span>
            Try:{' '}
            <span className="font-semibold" style={{ color: '#0A1628' }}>
              &quot;Goulds 3196 in Texas&quot;
            </span>
            ,{' '}
            <span className="font-semibold" style={{ color: '#0A1628' }}>
              &quot;verified pump rebuilders&quot;
            </span>
            ,{' '}
            <span className="font-semibold" style={{ color: '#0A1628' }}>
              &quot;SOS open today&quot;
            </span>
          </span>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <div className="flex flex-col gap-4">
            <div
              className="p-5"
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClockIcon size={14} style={{ color: '#5A6B82' }} />
                  <span
                    className="text-[12px] font-bold uppercase"
                    style={{ color: '#0A1628', letterSpacing: '0.07em' }}
                  >
                    Recent
                  </span>
                </div>
                <button type="button" className="text-[12px] font-semibold" style={{ color: '#5A6B82' }}>
                  Clear
                </button>
              </div>
              <div className="flex flex-col">
                {RECENT_SEARCHES.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid #F0F3F7' }}
                  >
                    <div
                      className="size-8 flex items-center justify-center shrink-0"
                      style={{
                        background:
                          r.kind === 'nl' ? 'rgba(255,107,43,0.10)' : '#F0F3F7',
                        color: r.kind === 'nl' ? '#FF6B2B' : '#5A6B82',
                        borderRadius: 999,
                      }}
                    >
                      {r.kind === 'nl' ? <SparkleIcon size={13} /> : <SearchIcon size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold truncate" style={{ color: '#0A1628' }}>
                        {r.q}
                      </div>
                      <div
                        className="text-[11.5px]"
                        style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                      >
                        {r.when}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="size-7 flex items-center justify-center"
                      style={{ color: '#94A3B8' }}
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="p-5"
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookmarkIcon size={13} style={{ color: '#5A6B82' }} />
                  <span
                    className="text-[12px] font-bold uppercase"
                    style={{ color: '#0A1628', letterSpacing: '0.07em' }}
                  >
                    Saved searches
                  </span>
                </div>
                <button type="button" className="text-[12px] font-semibold" style={{ color: '#1877F2' }}>
                  Manage
                </button>
              </div>
              <div className="grid gap-2">
                {SAVED_SEARCHES.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3"
                    style={{ background: '#F7F9FC', borderRadius: 10 }}
                  >
                    <div
                      className="size-9 flex items-center justify-center shrink-0"
                      style={{
                        background: '#fff',
                        color: '#0B2545',
                        borderRadius: 10,
                        border: '1px solid #E5E9EF',
                      }}
                    >
                      <BookmarkIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate" style={{ color: '#0A1628' }}>
                        {s.name}
                      </div>
                      <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
                        {s.last}
                      </div>
                    </div>
                    {s.alerts > 0 && (
                      <span
                        className="h-[22px] px-2 inline-flex items-center gap-1 text-[11px] font-bold"
                        style={{
                          background: 'rgba(255,107,43,0.12)',
                          color: '#FF6B2B',
                          borderRadius: 999,
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: '#FF6B2B' }}
                        />
                        {s.alerts} new
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div
              className="p-5"
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <FlameIcon size={13} style={{ color: '#FF6B2B' }} />
                <span
                  className="text-[12px] font-bold uppercase"
                  style={{ color: '#0A1628', letterSpacing: '0.07em' }}
                >
                  Trending in your network
                </span>
              </div>
              <div className="flex flex-col">
                {TRENDING_QUERIES.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid #F0F3F7' }}
                  >
                    <span
                      className="text-[11px] font-bold w-4 text-right"
                      style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold truncate" style={{ color: '#0A1628' }}>
                        {t.q}
                      </div>
                      <div className="text-[11px]" style={{ color: '#5A6B82' }}>
                        {t.count}
                      </div>
                    </div>
                    <TrendingIcon size={12} style={{ color: '#22C55E' }} />
                  </div>
                ))}
              </div>
            </div>

            <div
              className="p-5"
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <StoreIcon size={13} style={{ color: '#5A6B82' }} />
                <span
                  className="text-[12px] font-bold uppercase"
                  style={{ color: '#0A1628', letterSpacing: '0.07em' }}
                >
                  Browse by category
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_CATEGORIES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="flex items-center justify-between px-3 h-10 text-[13px] font-semibold"
                    style={{ background: '#F7F9FC', color: '#0A1628', borderRadius: 10 }}
                  >
                    <span>{c.label}</span>
                    <span
                      className="text-[11px]"
                      style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                    >
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
