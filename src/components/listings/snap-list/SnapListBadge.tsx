import { Sparkles } from "lucide-react"

export function SnapListBadge() {
  return (
    <span
      title="This listing was created with AI assistance. Nameplate data and specs were extracted from uploaded photos."
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
    >
      <Sparkles className="h-3 w-3" /> AI-Assisted
    </span>
  )
}
