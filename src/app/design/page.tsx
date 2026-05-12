import Link from 'next/link'

const previews = [
  {
    page: 'Settings · Company',
    description:
      'Sidebar nav + sectioned form with live buyer-preview rail. Mobile is a sectioned accordion with sticky save bar.',
    variants: [
      { label: 'Desktop · With buyer preview', href: '/design/settings?variant=desktop-preview' },
      { label: 'Desktop · Wide (no preview)', href: '/design/settings?variant=desktop-wide' },
      { label: 'Mobile · Accordion sections', href: '/design/settings?variant=mobile' },
    ],
  },
  {
    page: 'Search',
    description:
      'Cross-type search with NL chip parser, segment tabs, 3-way view switcher (List / Grid / Map).',
    variants: [
      { label: 'Desktop · Entry', href: '/design/search?variant=entry' },
      { label: 'Desktop · Results (List)', href: '/design/search?variant=results-list' },
      { label: 'Desktop · Results (Grid)', href: '/design/search?variant=results-grid' },
      { label: 'Desktop · Results (Map)', href: '/design/search?variant=results-map' },
      { label: 'Mobile · Entry', href: '/design/search?variant=mobile-entry' },
      { label: 'Mobile · Results', href: '/design/search?variant=mobile-results' },
    ],
  },
  {
    page: 'Profile',
    description: 'Person + company profiles, own + visiting POV, trust strip, tabs.',
    variants: [
      { label: 'Desktop · Person (Own)', href: '/design/profile?variant=person-own' },
      { label: 'Desktop · Person (Visiting)', href: '/design/profile?variant=person-visit' },
      { label: 'Desktop · Company (Visiting)', href: '/design/profile?variant=company-visit' },
      { label: 'Mobile · Person', href: '/design/profile?variant=mobile-person' },
      { label: 'Mobile · Company', href: '/design/profile?variant=mobile-company' },
    ],
  },
]

export default function DesignIndex() {
  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px' }}>
      <header style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: 'var(--mg-font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#5A6B82',
            marginBottom: 8,
          }}
        >
          Internal preview · Not linked from the live app
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: '#0A1628' }}>
          Inner pages — design handoff
        </h1>
        <p style={{ marginTop: 8, color: '#5A6B82', fontSize: 15 }}>
          Visual-only previews of the inner-page mockups. No live data wiring; these do not
          replace the production pages. Use these to align on look + layout before committing
          a page to the real app.
        </p>
      </header>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, listStyle: 'none', padding: 0 }}>
        {previews.map((p) => (
          <li
            key={p.page}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5EAF0',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: '#0A1628' }}>
              {p.page}
            </h2>
            <p style={{ marginTop: 4, color: '#5A6B82', fontSize: 13.5 }}>{p.description}</p>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {p.variants.map((v) => (
                <Link
                  key={v.href}
                  href={v.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 32,
                    padding: '0 12px',
                    background: '#0B2545',
                    color: '#FFFFFF',
                    fontSize: 12.5,
                    fontWeight: 700,
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  {v.label}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
