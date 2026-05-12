'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { updateCompany } from '@/app/actions/company'
import { toast } from 'sonner'
import { getCompanyIndustries, type CompanyWithMembers } from '@/types/company'
import { MultiIndustryPicker } from '@/components/forms/MultiIndustryPicker'
import Link from 'next/link'
import { Building, Phone, MapPin, Settings as SettingsIcon } from 'lucide-react'

const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

const CARD_SHADOW =
  '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

function SettingsSection({
  title,
  sub,
  icon,
  children,
}: {
  title: string
  sub?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl bg-card"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <header
        className="flex items-start gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="size-9 inline-flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: '#FFF4ED', color: '#FF6B2B', borderRadius: 10 }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-display text-[14.5px] font-bold tracking-tight text-foreground">
            {title}
          </div>
          {sub && (
            <div className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</div>
          )}
        </div>
      </header>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="text-[11.5px] font-bold inline-flex items-center gap-1 text-foreground">
        {label}
        {required && <span style={{ color: '#FF6B2B' }}>*</span>}
      </label>
      {hint && <div className="text-[10.5px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  )
}

const inputClass =
  'w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-[13.5px] focus:outline-none focus:ring-2 focus:ring-ring'
const textareaClass =
  'w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-[13.5px] focus:outline-none focus:ring-2 focus:ring-ring resize-none'

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
    industries: getCompanyIndustries(company),
    company_size: company.company_size ?? '',
    website: company.website ?? '',
    phone: company.phone ?? '',
    city: company.city ?? '',
    state: company.state ?? '',
  })

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Company name is required')
      return
    }
    startTransition(async () => {
      const payload = {
        name: form.name,
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        industries: form.industries,
        company_size: form.company_size || null,
        website: form.website.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
      }
      const result = await updateCompany(company.id, userId, payload)
      if (result.success) {
        toast.success('Company settings saved')
      } else {
        toast.error(result.error ?? 'Failed to save')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Identity"
        sub="How buyers see your company across Metal Gear."
        icon={<Building className="size-3.5" strokeWidth={2.5} />}
      >
        <div className="flex flex-col gap-1.5">
          <FieldLabel label="Company name" required />
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel label="Tagline" hint="One line. No emoji." />
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            placeholder="Trusted industrial equipment since 1987"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel
            label="Description"
            hint="Buyers read this before reaching out."
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
            placeholder="Tell buyers about your company…"
            className={textareaClass}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Capabilities & industries"
        sub="Powers search match scores and SOS routing."
        icon={<SettingsIcon className="size-3.5" strokeWidth={2.5} />}
      >
        <div className="flex flex-col gap-1.5">
          <FieldLabel
            label="Industries served"
            hint="Pick all that apply — buyers filter by these."
          />
          <MultiIndustryPicker
            value={form.industries}
            onChange={(next) => setForm((f) => ({ ...f, industries: next }))}
            unlimited
            placeholder="Add every industry your company serves"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel label="Company size" />
          <select
            value={form.company_size}
            onChange={(e) =>
              setForm((f) => ({ ...f, company_size: e.target.value }))
            }
            className={inputClass}
          >
            <option value="">Employees…</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Service area"
        sub="Shapes which SOS pings reach you."
        icon={<MapPin className="size-3.5" strokeWidth={2.5} />}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <FieldLabel label="City" />
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel label="State" />
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Contact"
        sub="How buyers reach out — at least one channel must be public."
        icon={<Phone className="size-3.5" strokeWidth={2.5} />}
      >
        <div className="flex flex-col gap-1.5">
          <FieldLabel label="Website" />
          <input
            type="url"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel label="Phone" />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={inputClass}
          />
        </div>
      </SettingsSection>

      {/* Sticky save bar (orange when dirty / actionable) */}
      <div
        className="sticky bottom-0 z-30 flex items-center justify-between gap-3 px-5 py-3 mt-2"
        style={{
          background: '#0A1628',
          color: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 -8px 24px rgba(11,37,69,0.18)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-2 rounded-full shrink-0"
            style={{
              background: '#FF6B2B',
              boxShadow: '0 0 0 4px rgba(255,107,43,0.20)',
            }}
          />
          <span className="text-[12.5px] font-bold truncate">
            Review your changes and save
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || !form.name.trim()}
          className="h-9 px-4 text-[12.5px] font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{
            background: '#FF6B2B',
            color: '#fff',
            borderRadius: 999,
            boxShadow: '0 4px 12px rgba(255,107,43,0.35)',
          }}
        >
          {isPending ? 'Saving…' : 'Save changes'}
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
