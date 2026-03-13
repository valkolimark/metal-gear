'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCompany } from '@/app/actions/company'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import type { CompanyRole } from '@/types/company'

const INDUSTRIES = [
  'Oil & Gas', 'Petrochemical', 'Mining', 'Manufacturing',
  'CNC Machining', 'Construction', 'Agriculture', 'Marine', 'Other',
]
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

export function CreateCompanyForm({
  userId,
  isFirstCompany,
}: {
  userId: string
  isFirstCompany: boolean
}) {
  const router = useRouter()
  const { setActiveCompany, setUserCompanies, userCompanies } = useAuthStore()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: '',
    industry: '',
    company_size: '',
    website: '',
    phone: '',
    city: '',
    state: '',
    tagline: '',
  })

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return }

    startTransition(async () => {
      // Convert empty strings to null for nullable DB columns
      const payload = {
        name: form.name.trim(),
        industry: form.industry || undefined,
        company_size: form.company_size || undefined,
        website: form.website.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        tagline: form.tagline.trim() || undefined,
      }
      const result = await createCompany(userId, payload)
      if (!result.success || !result.company) {
        toast.error(result.error ?? 'Failed to create company')
        return
      }
      const newCompany = { ...result.company, role: 'owner' as CompanyRole, membership_id: '' }
      setUserCompanies([...userCompanies, newCompany])
      setActiveCompany(newCompany)
      toast.success(`${result.company.name} created`)
      router.push('/dashboard')
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Company Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Acme Industrial Corp"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background
            text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Industry</label>
          <select
            value={form.industry}
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select&hellip;</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Company Size</label>
          <select
            value={form.company_size}
            onChange={e => setForm(f => ({ ...f, company_size: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Employees&hellip;</option>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">City</label>
          <input
            type="text"
            value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Houston"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">State</label>
          <input
            type="text"
            value={form.state}
            onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
            placeholder="TX"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Website</label>
        <input
          type="url"
          value={form.website}
          onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
          placeholder="https://acmeindustrial.com"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background
            text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Tagline</label>
        <input
          type="text"
          value={form.tagline}
          onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
          placeholder="Trusted industrial equipment since 1987"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background
            text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending || !form.name.trim()}
        className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold
          text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90
          transition-opacity"
      >
        {isPending
          ? 'Creating\u2026'
          : isFirstCompany ? 'Create Company & Continue' : 'Create Company'
        }
      </button>
    </div>
  )
}
