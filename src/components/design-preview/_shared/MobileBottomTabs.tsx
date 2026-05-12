import { HomeIcon, SearchIcon, SirenIcon, MessageIcon } from './icons'

type TabKey = 'feed' | 'browse' | 'sos' | 'messages' | 'me'

export function MobileBottomTabs({ active }: { active: TabKey }) {
  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: 'feed', label: 'Feed', icon: <HomeIcon size={18} /> },
    { key: 'browse', label: 'Browse', icon: <SearchIcon size={18} /> },
    { key: 'sos', label: 'SOS', icon: <SirenIcon size={18} /> },
    { key: 'messages', label: 'Inbox', icon: <MessageIcon size={18} />, badge: 4 },
    {
      key: 'me',
      label: 'Me',
      icon: (
        <div
          className="size-[18px] rounded-full"
          style={{
            background: '#0B2545',
            color: '#fff',
            fontSize: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
        >
          JD
        </div>
      ),
    },
  ]
  return (
    <div
      className="flex items-stretch shrink-0 px-2 pt-1.5 pb-2.5"
      style={{ background: '#FFFFFF', borderTop: '1px solid #E5E9EF' }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className="flex-1 flex flex-col items-center gap-0.5 py-1 relative"
          style={{ color: active === t.key ? '#FF6B2B' : '#5A6B82' }}
        >
          <div className="relative">
            {t.icon}
            {t.badge && (
              <span
                className="absolute -top-1 -right-2 px-1 h-[14px] min-w-[14px] inline-flex items-center justify-center text-[9px] font-bold"
                style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
              >
                {t.badge}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
