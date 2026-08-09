import { cn } from '@/lib/utils'
import {
  memberResponsivenessLabel,
  normalizeMemberResponsiveness,
  type MemberResponsivenessLevel,
} from '@/lib/member-responsiveness'

const LEVEL_STYLES: Record<MemberResponsivenessLevel, string> = {
  1: 'border-slate-200/80 bg-slate-500/10 text-slate-600',
  2: 'border-zinc-200/80 bg-zinc-500/10 text-zinc-600',
  3: 'border-blue-200/80 bg-blue-500/10 text-blue-700',
  4: 'border-orange-200/80 bg-orange-500/10 text-orange-700',
  5: 'border-red-200/80 bg-gradient-to-r from-orange-500/15 via-red-500/15 to-amber-500/15 text-red-700',
}

interface ResponsivenessBadgeProps {
  level: number | null | undefined
  className?: string
  showLabel?: boolean
}

export function ResponsivenessBadge({
  level,
  className,
  showLabel = true,
}: ResponsivenessBadgeProps) {
  const normalized = normalizeMemberResponsiveness(level)
  const isBurning = normalized === 5

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        LEVEL_STYLES[normalized],
        isBurning && 'animate-pulse shadow-sm shadow-orange-500/20',
        className,
      )}
      title={`Responsiveness ${normalized} — ${memberResponsivenessLabel(normalized)}`}
    >
      {isBurning ? <span aria-hidden>🔥</span> : null}
      <span>{normalized}</span>
      {showLabel ? <span className="font-medium">{memberResponsivenessLabel(normalized)}</span> : null}
    </span>
  )
}
