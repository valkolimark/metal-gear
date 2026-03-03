'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import {
  getOnboardingProgress,
  dismissOnboarding,
} from '@/app/actions/onboarding'
import { ONBOARDING_STEPS } from '@/lib/constants/onboarding'

const STEP_LINKS: Record<string, string> = {
  profile: '/profile',
  location: '/profile',
  browse: '/search',
  action: '/listings/new',
}

export function OnboardingChecklist() {
  const { user } = useAuthStore()
  const [stepsCompleted, setStepsCompleted] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const result = await getOnboardingProgress()
    if ('progress' in result && result.progress) {
      setStepsCompleted(result.progress.steps_completed || [])
      setDismissed(result.progress.dismissed || false)
      setAllDone(!!result.progress.completed_at)
    }
    setLoaded(true)
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    load()
  }, [load])

  async function handleDismiss() {
    const result = await dismissOnboarding()
    if ('success' in result) {
      setDismissed(true)
      toast.success('Onboarding dismissed')
    }
  }

  if (!loaded || dismissed || allDone || !user) return null

  const completedCount = stepsCompleted.length
  const totalSteps = ONBOARDING_STEPS.length
  const progress = (completedCount / totalSteps) * 100

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Rocket className="size-5 text-primary" />
            Get Started
          </CardTitle>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-surface">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-body text-xs text-muted-foreground">
            {completedCount}/{totalSteps}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ONBOARDING_STEPS.map((step) => {
          const completed = stepsCompleted.includes(step.id)
          return (
            <Link
              key={step.id}
              href={STEP_LINKS[step.id] || '/dashboard'}
              className={`flex items-start gap-3 rounded-lg p-2 transition-colors ${
                completed
                  ? 'opacity-60'
                  : 'hover:bg-surface'
              }`}
            >
              {completed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-400" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p
                  className={`font-body text-sm font-medium ${
                    completed
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }`}
                >
                  {step.label}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Link>
          )
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="mt-2 w-full font-body text-xs text-muted-foreground"
        >
          Skip onboarding
        </Button>
      </CardContent>
    </Card>
  )
}
