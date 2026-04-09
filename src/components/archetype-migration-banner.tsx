'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { confirmArchetype, type Archetype } from '@/app/actions/archetype'
import { useRouter } from 'next/navigation'
import {
  LOGISTICS_CAPABILITIES,
  LOGISTICS_COVERAGE_OPTIONS,
  FLEET_SIZE_OPTIONS,
} from '@/lib/constants/onboarding'

const ARCHETYPES = [
  {
    id: 'operator' as Archetype,
    label: 'Operator',
    icon: '🏭',
    description:
      'Plant managers, maintenance teams, procurement — you buy and operate industrial equipment.',
  },
  {
    id: 'trader' as Archetype,
    label: 'Trader',
    icon: '🔄',
    description:
      'You buy and sell machinery and scrap metal — dealer, rebuilder, or liquidator.',
  },
  {
    id: 'service_provider' as Archetype,
    label: 'Service Provider',
    icon: '🔧',
    description:
      'Rigging, crane, machine shop, demolition, inspection, fabrication — you provide services around industrial equipment.',
  },
  {
    id: 'logistics' as Archetype,
    label: 'Logistics',
    icon: '🚛',
    description:
      'You provide transport — fleet company or independent driver moving heavy equipment.',
    badge: 'No listing tools',
  },
]

interface Props {
  userId: string
  currentArchetype: Archetype | null
}

export function ArchetypeMigrationBanner({ userId, currentArchetype }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Archetype | null>(currentArchetype)
  const [step, setStep] = useState<'select' | 'details'>('select')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [logisticsType, setLogisticsType] = useState<'fleet' | 'individual' | null>(null)
  const [fleetSize, setFleetSize] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [coverage, setCoverage] = useState('')
  const [serviceArea, setServiceArea] = useState('')

  const needsDetails = selected === 'logistics'

  async function handleConfirm() {
    if (!selected) return
    setLoading(true)
    setError(null)

    const additionalData =
      selected === 'logistics'
        ? {
            logistics_type: logisticsType ?? undefined,
            fleet_size: fleetSize || undefined,
            equipment_capabilities: capabilities.length > 0 ? capabilities : undefined,
            logistics_coverage: coverage || undefined,
            service_area: serviceArea || undefined,
          }
        : {}

    const result = await confirmArchetype(userId, selected, additionalData)
    if (!result.success) {
      setError(result.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <>
      <div className="sticky top-[52px] z-40 w-full bg-primary px-4 py-3 md:top-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-lg">⚡</span>
            <p className="truncate font-body text-sm font-medium text-primary-foreground">
              We&apos;ve updated our user types — confirm yours to continue.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setOpen(true)}
            className="shrink-0 font-body font-semibold"
          >
            Confirm My Type
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {step === 'select' ? 'Confirm Your User Type' : 'A Few More Details'}
            </DialogTitle>
            <p className="font-body text-sm text-muted-foreground">
              {step === 'select'
                ? 'This is a one-time selection. Contact support to change it later.'
                : 'Help us personalize your experience.'}
            </p>
          </DialogHeader>

          {step === 'select' && (
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              {ARCHETYPES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    selected === a.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="mb-2 text-2xl">{a.icon}</div>
                  <div className="font-display text-sm font-semibold">{a.label}</div>
                  <div className="mt-1 font-body text-xs text-muted-foreground">
                    {a.description}
                  </div>
                  {'badge' in a && a.badge && (
                    <Badge
                      variant="secondary"
                      className="mt-2 border-0 font-body text-[10px]"
                    >
                      {a.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 'details' && selected === 'logistics' && (
            <div className="space-y-5 pt-2">
              <div>
                <label className="mb-2 block font-body text-sm font-medium">I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'fleet' as const, label: 'Fleet Company', desc: 'Multiple trucks/equipment' },
                    { id: 'individual' as const, label: 'Individual Driver', desc: 'Owner-operator' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setLogisticsType(t.id)}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        logisticsType === t.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <div className="font-body text-sm font-medium">{t.label}</div>
                      <div className="font-body text-xs text-muted-foreground">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {logisticsType === 'fleet' && (
                <div>
                  <label className="mb-2 block font-body text-sm font-medium">Fleet size</label>
                  <div className="flex flex-wrap gap-2">
                    {FLEET_SIZE_OPTIONS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setFleetSize(s.id)}
                        className={`rounded-full border-2 px-3 py-1.5 font-body text-sm transition-all ${
                          fleetSize === s.id
                            ? 'border-primary bg-primary/10 font-medium'
                            : 'border-border'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block font-body text-sm font-medium">
                  What can you haul?{' '}
                  <span className="font-normal text-muted-foreground">(select all)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {LOGISTICS_CAPABILITIES.map((cap) => (
                    <button
                      key={cap.id}
                      onClick={() =>
                        setCapabilities((prev) =>
                          prev.includes(cap.id)
                            ? prev.filter((c) => c !== cap.id)
                            : [...prev, cap.id]
                        )
                      }
                      className={`rounded-full border-2 px-3 py-1.5 font-body text-sm transition-all ${
                        capabilities.includes(cap.id)
                          ? 'border-primary bg-primary/10 font-medium'
                          : 'border-border'
                      }`}
                    >
                      {cap.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block font-body text-sm font-medium">Coverage area</label>
                <div className="flex flex-wrap gap-2">
                  {LOGISTICS_COVERAGE_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCoverage(c.id)}
                      className={`rounded-full border-2 px-3 py-1.5 font-body text-sm transition-all ${
                        coverage === c.id
                          ? 'border-primary bg-primary/10 font-medium'
                          : 'border-border'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-body text-sm font-medium">
                  States / regions you serve
                </label>
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. TX, LA, OK, Gulf Coast"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {error && <p className="font-body text-sm text-destructive">{error}</p>}

          <div className="flex justify-between pt-2">
            {step === 'details' && (
              <Button variant="ghost" onClick={() => setStep('select')} className="font-body">
                Back
              </Button>
            )}
            <div className="ml-auto">
              {step === 'select' ? (
                <Button
                  disabled={!selected || loading}
                  onClick={() => {
                    if (needsDetails) setStep('details')
                    else handleConfirm()
                  }}
                  className="font-body"
                >
                  {loading ? 'Saving…' : needsDetails ? 'Continue →' : 'Confirm My Type'}
                </Button>
              ) : (
                <Button
                  disabled={loading || !logisticsType}
                  onClick={handleConfirm}
                  className="font-body"
                >
                  {loading ? 'Saving…' : 'Confirm My Type'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
