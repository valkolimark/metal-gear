'use client'

import { useState } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import { CheckIcon, PlusIcon } from '../_shared/icons'
import {
  CompletenessCard,
  Field,
  LivePreview,
  SaveBar,
  Select,
  SettingsSection,
  SettingsSidebar,
  TagPicker,
  TextArea,
  TextInput,
  ToggleRow,
} from './SettingsShared'
import {
  SETTINGS_CAPABILITIES,
  SETTINGS_COMPANY,
  SETTINGS_INDUSTRIES,
  SETTINGS_INTEGRATIONS,
  SETTINGS_TEAM_PREVIEW,
  SETTINGS_VERIFY,
  type SettingsCompanyData,
} from './settings-data'

export type SettingsVariant = 'preview' | 'wide'

export function SettingsCompanyDesktop({ variant = 'preview' }: { variant?: SettingsVariant }) {
  const [data, setData] = useState<SettingsCompanyData>(SETTINGS_COMPANY)
  function set<K extends keyof SettingsCompanyData>(key: K, value: SettingsCompanyData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: '#F0F3F7',
        fontFamily: 'var(--mg-font-body)',
        color: '#0A1628',
      }}
    >
      <ModernHeader showSearchInline={false} />

      <div
        className="px-6 pt-5 pb-4 shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className="flex items-center gap-1.5 text-[11.5px] mb-1"
              style={{ color: '#5A6B82' }}
            >
              <a className="hover:underline" style={{ color: '#5A6B82' }}>
                Settings
              </a>
              <span style={{ color: '#CBD5E0' }}>/</span>
              <span className="font-bold" style={{ color: '#0A1628' }}>
                Company
              </span>
            </div>
            <h1
              className="text-[22px] font-bold leading-tight tracking-tight"
              style={{ fontFamily: 'var(--mg-font-display)' }}
            >
              Company profile
            </h1>
            <div className="text-[12.5px] mt-0.5" style={{ color: '#5A6B82' }}>
              How{' '}
              <span className="font-bold" style={{ color: '#0A1628' }}>
                {data.name}
              </span>{' '}
              appears across Metal Gear · public to all buyers
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 px-3.5 text-[12.5px] font-bold inline-flex items-center gap-1.5"
              style={{
                background: '#FFFFFF',
                color: '#0A1628',
                borderRadius: 999,
                border: '1px solid #E5E9EF',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview as buyer
            </button>
            <button
              type="button"
              className="h-9 px-3.5 text-[12.5px] font-bold inline-flex items-center gap-1.5"
              style={{
                background: '#FFFFFF',
                color: '#0A1628',
                borderRadius: 999,
                border: '1px solid #E5E9EF',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
              Share profile
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 grid overflow-hidden"
        style={{
          gridTemplateColumns:
            variant === 'preview' ? '240px 1fr 360px' : '240px 1fr',
        }}
      >
        <SettingsSidebar active="company" />

        <div className="overflow-y-auto px-6 py-5">
          <div className="max-w-[820px] mx-auto flex flex-col gap-4 [&>*]:shrink-0">
            <SettingsSection
              title="Branding"
              sub="Logo and cover photo shown on your profile, listings, and SOS responses."
              anchor="branding"
              icon={
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
                  <circle cx="13.5" cy="6.5" r="2.5" />
                  <circle cx="17.5" cy="10.5" r="2.5" />
                  <circle cx="8.5" cy="7.5" r="2.5" />
                  <circle cx="6.5" cy="12.5" r="2.5" />
                  <path d="M12 2a10 10 0 1 0 10 10c0-1.5-1-2-2-2h-3a2 2 0 0 0-2 2v3c0 1 .5 2 2 2a10 10 0 0 0 7-3" />
                </svg>
              }
            >
              <BrandingBlock data={data} />
            </SettingsSection>

            <SettingsSection
              title="Identity"
              sub="The name, tagline, and pitch that show up in search and on listings."
              anchor="identity"
              icon={
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
                  <rect width="16" height="20" x="4" y="2" rx="2" />
                  <path d="M9 22v-4h6v4" />
                </svg>
              }
            >
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Field label="Display name" required hint="What buyers see — keep it short.">
                  <TextInput value={data.name} onChange={(v) => set('name', v)} />
                </Field>
                <Field label="Legal name" hint="Used on invoices and verification.">
                  <TextInput value={data.legalName} onChange={(v) => set('legalName', v)} />
                </Field>
                <Field
                  label="Tagline"
                  span="full"
                  counter={`${data.tagline.length}/60`}
                  hint="One line. No emoji."
                >
                  <TextInput value={data.tagline} onChange={(v) => set('tagline', v)} />
                </Field>
                <Field
                  label="Description"
                  span="full"
                  counter={`${data.description.length}/600`}
                  hint="Markdown supported. Buyers read this before reaching out."
                >
                  <TextArea
                    value={data.description}
                    onChange={(v) => set('description', v)}
                    rows={5}
                  />
                </Field>
                <Field label="Founded" span="half">
                  <TextInput value={data.founded} onChange={(v) => set('founded', v)} mono />
                </Field>
                <Field label="Public URL slug" span="half">
                  <TextInput
                    value={data.slug}
                    onChange={(v) => set('slug', v)}
                    prefix="metalgear.com/c/"
                    mono
                  />
                </Field>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Capabilities & industries"
              sub="Powers search match scores and SOS routing."
              anchor="capabilities"
              icon={
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
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            >
              <Field
                label="Industries served"
                hint="Pick all that apply — buyers filter by these."
              >
                <TagPicker
                  values={data.industries}
                  onChange={(v) => set('industries', v)}
                  options={SETTINGS_INDUSTRIES}
                  color="#1877F2"
                />
              </Field>
              <Field label="Capabilities & services">
                <TagPicker
                  values={data.capabilities}
                  onChange={(v) => set('capabilities', v)}
                  options={SETTINGS_CAPABILITIES}
                  color="#FF6B2B"
                />
              </Field>
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Field label="Company size" span="half">
                  <Select
                    value={data.size}
                    onChange={(v) => set('size', v)}
                    options={['1–10', '11–50', '51–200', '201–500', '500+']}
                  />
                </Field>
                <Field label="Founded year" span="half">
                  <TextInput value={data.founded} onChange={(v) => set('founded', v)} mono />
                </Field>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Service area"
              sub="Shapes which SOS pings reach you on Radar."
              anchor="service"
              icon={
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
                  <path d="M12 22s-8-7.5-8-13a8 8 0 1 1 16 0c0 5.5-8 13-8 13z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              }
            >
              <ServiceAreaBlock data={data} set={set} />
            </SettingsSection>

            <SettingsSection
              title="Contact"
              sub="How buyers reach out — at least one channel must be public."
              anchor="contact"
              icon={
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
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              }
            >
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Field label="Phone" span="half">
                  <TextInput
                    value={data.phone}
                    onChange={(v) => set('phone', v)}
                    prefix="+1"
                    mono
                  />
                </Field>
                <Field label="Email" span="half">
                  <TextInput value={data.email} onChange={(v) => set('email', v)} />
                </Field>
                <Field label="Website" span="full">
                  <TextInput
                    value={data.website}
                    onChange={(v) => set('website', v)}
                    prefix="https://"
                  />
                </Field>
                <Field
                  label="Hours"
                  span="full"
                  hint="Buyers see this on your profile and SOS responses."
                >
                  <TextInput value={data.hours} onChange={(v) => set('hours', v)} />
                </Field>
              </div>
              <div className="border-t pt-3" style={{ borderColor: '#F0F3F7' }}>
                <ToggleRow
                  label="Accept emergency SOS"
                  sub="Critical-urgency pings reach your team's phones outside normal hours."
                  value={data.emergency}
                  onChange={(v) => set('emergency', v)}
                  accent="#FF6B2B"
                />
                <ToggleRow
                  label="Show phone number publicly"
                  sub="Off keeps it gated behind buyer-verified messages."
                  value={true}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title="Verification"
              sub="Verified badges boost search rank and unlock SOS payouts."
              anchor="verify"
              icon={
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
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                </svg>
              }
            >
              <div className="flex flex-col">
                {SETTINGS_VERIFY.map((v, i) => (
                  <div
                    key={v.key}
                    className="flex items-center gap-3 py-3"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid #F0F3F7' }}
                  >
                    <span
                      className="size-9 inline-flex items-center justify-center shrink-0"
                      style={{
                        background:
                          v.status === 'verified'
                            ? 'rgba(34,197,94,0.10)'
                            : 'rgba(255,107,43,0.10)',
                        color: v.status === 'verified' ? '#16A34A' : '#FF6B2B',
                        borderRadius: 999,
                      }}
                    >
                      {v.status === 'verified' ? (
                        <CheckIcon size={15} />
                      ) : (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" x2="12" y1="8" y2="12" />
                          <line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[12.5px] font-bold"
                          style={{ color: '#0A1628' }}
                        >
                          {v.label}
                        </span>
                        <span
                          className="text-[9.5px] font-bold uppercase px-1.5 h-[15px] inline-flex items-center"
                          style={{
                            background:
                              v.status === 'verified'
                                ? 'rgba(34,197,94,0.10)'
                                : 'rgba(255,107,43,0.10)',
                            color: v.status === 'verified' ? '#16A34A' : '#FF6B2B',
                            borderRadius: 3,
                            letterSpacing: '0.08em',
                            fontFamily: 'var(--mg-font-mono)',
                          }}
                        >
                          {v.status}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#5A6B82' }}>
                        {v.detail}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="h-8 px-3 text-[11.5px] font-bold"
                      style={{
                        background: v.status === 'verified' ? '#FFFFFF' : '#FF6B2B',
                        color: v.status === 'verified' ? '#0A1628' : '#FFFFFF',
                        border: v.status === 'verified' ? '1px solid #E5E9EF' : 'none',
                        borderRadius: 999,
                      }}
                    >
                      {v.status === 'verified' ? 'View' : 'Re-upload'}
                    </button>
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Team"
              sub="Members who can manage listings, respond to SOS, and represent the company."
              action={
                <button
                  type="button"
                  className="h-8 px-3 text-[11.5px] font-bold inline-flex items-center gap-1"
                  style={{ background: '#0A1628', color: '#fff', borderRadius: 999 }}
                >
                  <PlusIcon size={11} /> Invite
                </button>
              }
              anchor="team"
              icon={
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            >
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {SETTINGS_TEAM_PREVIEW.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-2.5 p-2.5"
                    style={{
                      background: '#FBFCFD',
                      borderRadius: 10,
                      border: '1px solid #F0F3F7',
                    }}
                  >
                    <div
                      className="size-9 inline-flex items-center justify-center shrink-0 text-[12px] font-bold"
                      style={{
                        background:
                          'linear-gradient(135deg, #0B2545 0%, #1E3A8A 100%)',
                        color: '#fff',
                        borderRadius: 999,
                      }}
                    >
                      {t.init}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12.5px] font-bold truncate"
                        style={{ color: '#0A1628' }}
                      >
                        {t.name}
                      </div>
                      <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                        {t.role}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="size-7 inline-flex items-center justify-center"
                      style={{ color: '#94A3B8' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <a
                className="text-[12px] font-bold inline-flex items-center gap-1"
                style={{ color: '#FF6B2B' }}
              >
                Manage all 6 team members →
              </a>
            </SettingsSection>

            <SettingsSection
              title="Connected integrations"
              sub="Push events to the tools your team already uses."
              anchor="integ"
              icon={
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
                  <path d="M12 22v-5" />
                  <path d="M9 7V2" />
                  <path d="M15 7V2" />
                  <path d="M6 13V8h12v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z" />
                </svg>
              }
            >
              <div className="flex flex-col gap-2">
                {SETTINGS_INTEGRATIONS.map((i) => (
                  <div
                    key={i.key}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      background: '#FBFCFD',
                      borderRadius: 10,
                      border: '1px solid #F0F3F7',
                    }}
                  >
                    <span
                      className="size-9 inline-flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: i.color, color: '#fff', borderRadius: 8 }}
                    >
                      {i.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <div className="text-[12.5px] font-bold" style={{ color: '#0A1628' }}>
                        {i.name}
                      </div>
                      <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                        {i.sub}
                      </div>
                    </div>
                    <span
                      className="text-[10.5px] font-bold uppercase px-2 h-[20px] inline-flex items-center"
                      style={{
                        background: i.on ? 'rgba(34,197,94,0.10)' : '#F0F3F7',
                        color: i.on ? '#16A34A' : '#5A6B82',
                        borderRadius: 999,
                        letterSpacing: '0.06em',
                        fontFamily: 'var(--mg-font-mono)',
                      }}
                    >
                      {i.on ? 'connected' : 'disconnected'}
                    </span>
                    <button
                      type="button"
                      className="text-[11.5px] font-bold"
                      style={{ color: '#0A1628' }}
                    >
                      {i.on ? 'Configure' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Danger zone"
              sub="Account actions that can't be undone."
              anchor="danger"
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#DC2626' }}
                >
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
              }
            >
              <div className="flex items-center justify-between gap-3 py-2">
                <div>
                  <div className="text-[12.5px] font-bold" style={{ color: '#0A1628' }}>
                    Pause company profile
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#5A6B82' }}>
                    Hides listings and SOS responses without deleting anything.
                  </div>
                </div>
                <button
                  type="button"
                  className="h-8 px-3 text-[11.5px] font-bold"
                  style={{
                    background: '#FFFFFF',
                    color: '#0A1628',
                    border: '1px solid #E5E9EF',
                    borderRadius: 999,
                  }}
                >
                  Pause
                </button>
              </div>
              <div
                className="flex items-center justify-between gap-3 py-2 border-t"
                style={{ borderColor: '#F0F3F7' }}
              >
                <div>
                  <div className="text-[12.5px] font-bold" style={{ color: '#DC2626' }}>
                    Delete company
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#5A6B82' }}>
                    Permanently removes the profile, listings, and reviews. Team members keep
                    their personal accounts.
                  </div>
                </div>
                <button
                  type="button"
                  className="h-8 px-3 text-[11.5px] font-bold"
                  style={{
                    background: 'rgba(220,38,38,0.08)',
                    color: '#DC2626',
                    borderRadius: 999,
                  }}
                >
                  Delete
                </button>
              </div>
            </SettingsSection>

            <div className="h-2" />
            <SaveBar />
            <div className="h-4" />
          </div>
        </div>

        {variant === 'preview' && (
          <div
            className="overflow-y-auto px-4 py-5"
            style={{ borderLeft: '1px solid #E5E9EF', background: '#FBFCFD' }}
          >
            <div className="flex flex-col gap-3 [&>*]:shrink-0">
              <CompletenessCard />
              <LivePreview data={data} />
              <div
                className="px-3 py-3 shrink-0"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E5E9EF',
                }}
              >
                <div
                  className="text-[10.5px] font-bold uppercase mb-1"
                  style={{
                    color: '#94A3B8',
                    letterSpacing: '0.10em',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  Last activity
                </div>
                <ul className="flex flex-col gap-1.5 mt-1.5">
                  {[
                    { who: 'Wes Landry', what: 'changed service radius', when: '4m' },
                    { who: 'Carla Vega', what: 'added "Pump skid"', when: '2h' },
                    { who: 'You', what: 'updated tagline', when: '3d' },
                  ].map((a, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-1.5 text-[11px]"
                      style={{ color: '#5A6B82' }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: '#FF6B2B' }}
                      />
                      <span className="font-bold" style={{ color: '#0A1628' }}>
                        {a.who}
                      </span>
                      <span>{a.what}</span>
                      <span
                        className="ml-auto"
                        style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                      >
                        {a.when}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BrandingBlock({ data }: { data: SettingsCompanyData }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '180px 1fr' }}>
      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-bold" style={{ color: '#0A1628' }}>
          Logo
        </span>
        <div
          className="relative size-[160px] inline-flex items-center justify-center group cursor-pointer"
          style={{
            background: data.logoBg,
            color: '#fff',
            borderRadius: 18,
            fontFamily: 'var(--mg-font-display)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontSize: 42,
            boxShadow: '0 8px 24px rgba(255,107,43,0.30)',
          }}
        >
          {data.logoText}
          <span
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[11px] font-bold uppercase"
            style={{
              background: 'rgba(0,0,0,0.50)',
              borderRadius: 18,
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            Replace
          </span>
        </div>
        <button
          type="button"
          className="text-[11px] font-bold inline-flex items-center gap-1"
          style={{ color: '#FF6B2B' }}
        >
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          Upload PNG / SVG
        </button>
      </div>

      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold" style={{ color: '#0A1628' }}>
            Cover photo
          </span>
          <span
            className="text-[10.5px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            recommended 1600 × 400
          </span>
        </div>
        <div
          className="relative h-[160px] overflow-hidden cursor-pointer group"
          style={{ background: data.coverBg, borderRadius: 14 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 80% 30%, rgba(255,255,255,0.22) 0%, transparent 60%)',
            }}
          />
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 600 160"
          >
            {[20, 50, 80, 110].map((y) => (
              <path
                key={y}
                d={`M0 ${y} Q 150 ${y - 10} 300 ${y} T 600 ${y - 5}`}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="1"
                fill="none"
              />
            ))}
          </svg>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
              style={{
                background: 'rgba(0,0,0,0.40)',
                color: '#fff',
                borderRadius: 4,
                letterSpacing: '0.08em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              1600 × 400 · JPG
            </span>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"
            style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 14 }}
          >
            <span
              className="text-[12px] font-bold uppercase"
              style={{
                color: '#fff',
                letterSpacing: '0.08em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              Replace cover
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="text-[11px] font-bold inline-flex items-center gap-1"
            style={{ color: '#FF6B2B' }}
          >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            Upload photo
          </button>
          <span style={{ color: '#CBD5E0' }}>·</span>
          <button type="button" className="text-[11px] font-bold" style={{ color: '#5A6B82' }}>
            Pick a gradient
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceAreaBlock({
  data,
  set,
}: {
  data: SettingsCompanyData
  set: <K extends keyof SettingsCompanyData>(key: K, value: SettingsCompanyData[K]) => void
}) {
  return (
    <>
      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
        <Field label="City" span="half">
          <TextInput value={data.city} onChange={(v) => set('city', v)} />
        </Field>
        <Field label="State" span="half">
          <Select
            value={data.state}
            onChange={(v) => set('state', v)}
            options={['TX', 'LA', 'OK', 'NM', 'AR', 'MS', 'AL', 'FL', 'CA']}
          />
        </Field>
        <Field label="ZIP" span="half">
          <TextInput value={data.zip} onChange={(v) => set('zip', v)} mono />
        </Field>
      </div>
      <Field
        label="Service radius"
        hint={`Reach ${Math.round(
          (Math.PI * data.serviceRadius * data.serviceRadius) / 1000
        )}k mi² of facilities. Larger radius = more SOS pings but longer drives.`}
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={25}
            max={500}
            value={data.serviceRadius}
            onChange={(e) => set('serviceRadius', Number(e.target.value))}
            style={{ flex: 1, accentColor: '#FF6B2B' }}
          />
          <span
            className="text-[14px] font-bold"
            style={{
              color: '#0A1628',
              fontFamily: 'var(--mg-font-display)',
              minWidth: 60,
            }}
          >
            {data.serviceRadius} mi
          </span>
        </div>
      </Field>
      <div
        className="relative h-[180px] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #EAF2F8 0%, #DCE6F0 100%)',
          borderRadius: 12,
          border: '1px solid #E5E9EF',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(11,37,69,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(11,37,69,0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 600 180"
        >
          <path
            d="M0 130 Q 150 110 300 125 T 600 115 L 600 180 L 0 180 Z"
            fill="rgba(14,165,233,0.16)"
          />
        </svg>
        <div
          className="absolute"
          style={{ left: '50%', top: '52%', transform: 'translate(-50%,-50%)' }}
        >
          {[1, 0.66, 0.33].map((scale, i) => {
            const sz = (data.serviceRadius / 500) * 280 * scale
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: sz,
                  height: sz,
                  left: -sz / 2,
                  top: -sz / 2,
                  border:
                    i === 0
                      ? '1px dashed rgba(255,107,43,0.55)'
                      : '1px solid rgba(255,107,43,0.30)',
                  background: i === 2 ? 'rgba(255,107,43,0.08)' : 'transparent',
                }}
              />
            )
          })}
          <div className="absolute" style={{ left: -5, top: -5 }}>
            <div
              className="size-2.5 rounded-full"
              style={{
                background: '#FF6B2B',
                border: '2px solid #fff',
                boxShadow: '0 0 0 3px rgba(255,107,43,0.30)',
              }}
            />
          </div>
          <div
            className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
            style={{
              left: 0,
              top: 14,
              background: '#0A1628',
              color: '#fff',
              borderRadius: 4,
              letterSpacing: '0.06em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {data.city}, {data.state}
          </div>
        </div>
        {[
          { x: '30%', y: '35%' },
          { x: '68%', y: '42%' },
          { x: '42%', y: '68%' },
          { x: '78%', y: '58%' },
          { x: '22%', y: '58%' },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{
              left: p.x,
              top: p.y,
              background: '#0A1628',
              boxShadow: '0 0 0 2px #fff',
            }}
          />
        ))}
        <div
          className="absolute top-2 left-3 text-[10px] font-bold uppercase"
          style={{
            color: '#5A6B82',
            letterSpacing: '0.08em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          ~ 142 facilities in radius
        </div>
      </div>
    </>
  )
}
