import Link from 'next/link'
import type { NavCompanyMembership } from '@/lib/layout/nav-data'

interface AppSidebarCompanyListProps {
  companies: NavCompanyMembership[]
  activeCompanyId: string | null
}

export function AppSidebarCompanyList({ companies, activeCompanyId }: AppSidebarCompanyListProps) {
  if (companies.length === 0) {
    return (
      <div className="mx-3 mt-1 rounded-lg border border-dashed border-border/60 p-3" data-sidebar-label>
        <p className="font-body text-xs text-muted-foreground">
          You haven&rsquo;t joined a company yet.
        </p>
        <Link
          href="/companies/new"
          className="mt-1 inline-block font-body text-xs font-medium text-primary hover:underline"
          data-nav-event="primary:create-company"
        >
          Create one →
        </Link>
      </div>
    )
  }

  const visible = companies.slice(0, 5)
  const hidden = companies.length - visible.length

  return (
    <div className="mt-1 space-y-0.5">
      <p
        className="px-5 pb-1 font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        data-sidebar-label
      >
        Your companies
      </p>
      {visible.map((c) => {
        const isActive = c.companyId === activeCompanyId
        return (
          <Link
            key={c.companyId}
            href={`/companies/${c.companySlug}`}
            data-nav-event="primary:company"
            data-active-company={isActive ? 'true' : undefined}
            className="mx-2 flex h-9 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded bg-primary/10 text-[10px] font-semibold text-primary"
            >
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt="" className="size-full object-cover" />
              ) : (
                c.initials
              )}
            </span>
            <span className="flex-1 truncate" data-sidebar-label>
              {c.companyName}
            </span>
            <span
              className="font-body text-[10px] uppercase tracking-wide text-muted-foreground"
              data-sidebar-label
            >
              {c.role}
            </span>
          </Link>
        )
      })}
      {hidden > 0 && (
        <Link
          href="/settings/company"
          className="mx-2 flex h-7 items-center gap-2 rounded-lg px-3 font-body text-xs text-muted-foreground hover:bg-muted/50"
          data-sidebar-label
        >
          + {hidden} more
        </Link>
      )}
    </div>
  )
}
