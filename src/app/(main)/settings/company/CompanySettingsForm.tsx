'use client'

import { useState, useTransition } from 'react'
import { updateCompany } from '@/app/actions/company'
import { toast } from 'sonner'
import type { CompanyWithMembers } from '@/types/company'
import Link from 'next/link'

const INDUSTRIES = [
  'Oil & Gas', 'Petrochemical', 'Mining', 'Manufacturing',
  'CNC Machining', 'Construction', 'Agriculture', 'Marine', 'Other',
]
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

export function CompanySettingsForm({
  company,
  userId,
}: {
  company: CompanyWithMembers
  userId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: company.name,
    tagline: company.tagline ?? '',
    description: company.description ?? '',
    industry: company.industry ?? '',
    company_size: company.company_size ?? '',
    website: company.website ?? '',
    phone: company.phone ?? '',
    city: company.city ?? '',
    state: company.state ?? '',
  })

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return }

    startTransition(async () => {
      const result = await updateCompany(company.id, userId, form)
      if (result.success) {
        toast.success('Company settings saved')
      } else {
        toast.error(result.error ?? 'Failed to save')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Company Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Tell buyers about your company..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || !form.name.trim()}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold
            text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90
            transition-opacity"
        >
          {isPending ? 'Saving\u2026' : 'Save Changes'}
        </button>
      </div>

      <div className="flex items-center justify-between px-1">
        <Link
          href="/settings/company/members"
          className="text-sm text-primary hover:underline"
        >
          Manage team members &rarr;
        </Link>
        <span className="text-xs text-muted-foreground">
          Slug: {company.slug}
        </span>
      </div>
    </div>
  )
}
