import { Sparkles } from "lucide-react"

export function SnapListBadge() {
  return (
    <span
      title="This listing was drafted from uploaded photos and reviewed by the seller before publishing."
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
    >
      <Sparkles className="h-3 w-3" /> Photo-to-Listing draft
    </span>
  )
}
