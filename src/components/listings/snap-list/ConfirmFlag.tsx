import { cn } from "@/lib/utils"

interface Props {
  show: boolean
  className?: string
}

export function ConfirmFlag({ show, className }: Props) {
  if (!show) return null
  return (
    <span
      aria-label="Lower confidence on this field — please verify"
      title="Lower confidence on this field — please verify"
      className={cn(
        "inline-block h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]",
        className,
      )}
    />
  )
}
