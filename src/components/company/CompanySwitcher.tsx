'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { switchActiveCompany } from '@/app/actions/company-context'
import { CompanyAvatar } from './CompanyAvatar'
import { Check, ChevronDown, Plus } from 'lucide-react'

interface CompanySwitcherProps {
  variant?: 'header' | 'drawer'
}

export function CompanySwitcher({ variant = 'header' }: CompanySwitcherProps) {
  const { activeCompany, userCompanies, setActiveCompany } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const userId = useAuthStore(s => s.profile?.id ?? s.user?.id ?? '')

  const handleSwitch = (company: typeof activeCompany) => {
    if (!company || company.id === activeCompany?.id) { setOpen(false); return }
    startTransition(async () => {
      setActiveCompany(company)
      setOpen(false)
      await switchActiveCompany(userId, company.id)
      router.refresh()
    })
  }

  if (!activeCompany) return null

  if (variant === 'drawer') {
    return (
      <div className="w-full">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50
            hover:bg-muted transition-colors"
        >
          <CompanyAvatar name={activeCompany.name} logoUrl={activeCompany.logo_url} size={40} />
          <div className="flex-1 text-left min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
              {activeCompany.name}
            </div>
            <div className="text-[11px] text-muted-foreground capitalize">
              {activeCompany.role}
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform flex-shrink-0
              ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="mt-1 rounded-xl border border-border bg-card overflow-hidden">
            {userCompanies.map(company => (
              <button
                key={company.id}
                onClick={() => handleSwitch(company)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors text-left"
              >
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{company.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{company.role}</div>
                </div>
                {company.id === activeCompany.id && (
                  <Check size={14} className="text-primary flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-border">
              <button
                onClick={() => { setOpen(false); router.push('/companies/new') }}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-md border-2 border-dashed border-border
                  flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Add another company</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // variant === 'header'
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border
          text-sm font-medium transition-all
          ${open
            ? 'border-primary/50 bg-primary/5 text-foreground'
            : 'border-border bg-card text-foreground hover:border-primary/30'
          }`}
      >
        <CompanyAvatar name={activeCompany.name} logoUrl={activeCompany.logo_url} size={20} />
        <span className="max-w-[140px] truncate">{activeCompany.name}</span>
        <ChevronDown
          size={13}
          className={`text-muted-foreground transition-transform
            ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1.5 left-0 z-50 w-64 rounded-xl border
            border-border bg-card shadow-xl overflow-hidden">
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest
                text-muted-foreground">
                Your Companies
              </p>
            </div>
            {userCompanies.map(company => (
              <button
                key={company.id}
                onClick={() => handleSwitch(company)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors"
              >
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={32} />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{company.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{company.role}</div>
                </div>
                {company.id === activeCompany.id && (
                  <Check size={14} className="text-primary flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-border">
              <button
                onClick={() => { setOpen(false); router.push('/companies/new') }}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-md border-2 border-dashed border-border
                  flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Add another company</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
