'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  getEquipmentInterests,
  updateEquipmentInterests,
  type EquipmentInterestsData,
} from '@/app/actions/interests'
import { EQUIPMENT_TAXONOMY } from '@/lib/constants/equipment-taxonomy'
import { ONBOARDING_INDUSTRIES } from '@/lib/constants/onboarding'

function sortedJSON(arr: string[]): string {
  return JSON.stringify([...arr].sort())
}

export function EquipmentInterestsEditor() {
  const [loading, setLoading] = useState(true)
  const [selectedTier2, setSelectedTier2] = useState<string[]>([])
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [initial, setInitial] = useState<EquipmentInterestsData>({
    tier2Groups: [],
    industries: [],
  })
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    getEquipmentInterests()
      .then((data) => {
        if (cancelled) return
        setSelectedTier2(data.tier2Groups)
        setSelectedIndustries(data.industries)
        setInitial(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hasChanges =
    sortedJSON(selectedTier2) !== sortedJSON(initial.tier2Groups) ||
    sortedJSON(selectedIndustries) !== sortedJSON(initial.industries)

  function toggleTier2(group: string) {
    setSelectedTier2((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }

  function toggleIndustry(industry: string) {
    setSelectedIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    )
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateEquipmentInterests({
        tier2Groups: selectedTier2,
        industries: selectedIndustries,
      })
      if (result.success) {
        setInitial({ tier2Groups: selectedTier2, industries: selectedIndustries })
        toast.success('Interests updated — your feed and SOS alerts will reflect this shortly.')
      } else {
        toast.error(result.error)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Industries */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-1">Industries</h3>
        <p className="font-body text-xs text-muted-foreground mb-3">
          Used to match you with relevant SOS requests and feed content.
        </p>
        <div className="flex flex-wrap gap-2">
          {ONBOARDING_INDUSTRIES.map((industry) => {
            const isSelected = selectedIndustries.includes(industry)
            return (
              <button
                key={industry}
                type="button"
                onClick={() => toggleIndustry(industry)}
                className={[
                  'px-3 py-1.5 rounded-full font-body text-sm font-medium border-2 transition-all duration-150',
                  isSelected
                    ? 'border-[#1877F2] text-[#1877F2] bg-[#1877F2]/10'
                    : 'border-border text-muted-foreground hover:border-muted-foreground',
                ].join(' ')}
              >
                {industry}
              </button>
            )
          })}
        </div>
      </div>

      {/* Equipment Types grouped by Tier 1 bucket */}
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-1">Equipment Types</h3>
        <p className="font-body text-xs text-muted-foreground mb-3">
          SOS alerts are only sent to users who have selected matching equipment types. Select every
          category you work with.
        </p>
        <div className="space-y-4">
          {EQUIPMENT_TAXONOMY.map((bucket) => (
            <div key={bucket.id}>
              <h4 className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {bucket.label}
              </h4>
              <div className="flex flex-wrap gap-2">
                {bucket.groups.map((group) => {
                  const isSelected = selectedTier2.includes(group.id)
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleTier2(group.id)}
                      className={[
                        'px-3 py-1.5 rounded-full font-body text-sm font-medium border-2 transition-all duration-150',
                        isSelected
                          ? 'border-[#FF6B2B] text-[#FF6B2B] bg-[#FF6B2B]/10'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      ].join(' ')}
                    >
                      {group.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Interests'
          )}
        </Button>
        {!hasChanges && !isPending && (
          <span className="font-body text-xs text-muted-foreground">No unsaved changes</span>
        )}
      </div>
    </div>
  )
}
