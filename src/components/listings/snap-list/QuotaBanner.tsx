import Link from "next/link"
import { Sparkles } from "lucide-react"

interface Props {
  remaining: number
  limit: number
  tier: string
}

export function QuotaBanner({ remaining, limit, tier }: Props) {
  if (!Number.isFinite(limit)) return null
  if (remaining >= limit && tier === "free") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 text-amber-600" />
        <div className="flex-1">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            You&apos;ve used {limit} of {limit} Photo-to-Listing drafts this month
          </p>
          <p className="text-amber-800/80 dark:text-amber-200/80">
            Paid plans include unlimited Photo-to-Listing drafts.{" "}
            <Link href="/pricing" className="underline font-medium">
              Compare plans
            </Link>
          </p>
        </div>
      </div>
    )
  }
  if (tier !== "free") return null
  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <div>
        <span className="font-medium text-primary">{remaining}</span>{" "}
        of {limit} Photo-to-Listing drafts remaining this month
      </div>
      <Link href="/pricing" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Upgrade for unlimited →
      </Link>
    </div>
  )
}
