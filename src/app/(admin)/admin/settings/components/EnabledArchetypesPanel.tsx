'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getEnabledArchetypesConfig, updateEnabledArchetypesConfig } from '../../actions'

// Cycle 66 — labels chosen to match the onboarding Step 1 copy. Order matches
// `ALL_ARCHETYPES` so toggles behave consistently with the helper.
const ARCHETYPE_LABELS: Record<string, { name: string; subtitle: string }> = {
  operator: { name: 'Operator', subtitle: 'Plant Manager' },
  trader: { name: 'Trader', subtitle: 'Dealer / Reseller' },
  service_provider: { name: 'Service Provider', subtitle: 'Rigging / Machining / etc.' },
  logistics: { name: 'Logistics', subtitle: 'Fleet / Driver' },
}

export function EnabledArchetypesPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [all, setAll] = useState<readonly string[]>([])
  const [enabled, setEnabled] = useState<string[]>([])
  const [initialEnabled, setInitialEnabled] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    getEnabledArchetypesConfig()
      .then((cfg) => {
        if (cancelled) return
        setAll(cfg.all)
        setEnabled([...cfg.enabled])
        setInitialEnabled([...cfg.enabled])
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load archetype config')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggle(archetype: string, checked: boolean) {
    if (!checked && enabled.length === 1 && enabled.includes(archetype)) {
      return
    }
    setEnabled((prev) =>
      checked ? [...prev, archetype].filter((v, i, a) => a.indexOf(v) === i) : prev.filter((v) => v !== archetype),
    )
  }

  async function save() {
    setSaving(true)
    const result = await updateEnabledArchetypesConfig({ enabled })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Archetype availability updated')
      setInitialEnabled([...enabled])
    }
    setSaving(false)
  }

  const dirty =
    enabled.length !== initialEnabled.length ||
    enabled.some((v) => !initialEnabled.includes(v))

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Enabled User Archetypes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <TooltipProvider delayDuration={150}>
            {all.map((archetype) => {
              const meta = ARCHETYPE_LABELS[archetype] ?? { name: archetype, subtitle: '' }
              const isChecked = enabled.includes(archetype)
              const isLastEnabled = isChecked && enabled.length === 1
              const checkbox = (
                <Checkbox
                  id={`archetype-${archetype}`}
                  checked={isChecked}
                  disabled={isLastEnabled}
                  onCheckedChange={(state) => toggle(archetype, state === true)}
                />
              )
              return (
                <div
                  key={archetype}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">{meta.name}</p>
                    <p className="font-body text-xs text-muted-foreground">{meta.subtitle}</p>
                  </div>
                  {isLastEnabled ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{checkbox}</span>
                      </TooltipTrigger>
                      <TooltipContent>At least one archetype must remain enabled</TooltipContent>
                    </Tooltip>
                  ) : (
                    checkbox
                  )}
                </div>
              )
            })}
          </TooltipProvider>
        </div>

        <p className="font-body text-xs text-muted-foreground">
          Disabled archetypes are hidden from the onboarding flow. Existing users with these archetypes
          continue to function normally. Re-enabling shows the archetype in onboarding immediately.
        </p>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
