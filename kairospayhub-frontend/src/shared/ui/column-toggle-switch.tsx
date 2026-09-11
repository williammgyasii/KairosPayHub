import { cn } from '@/shared/lib/utils'

export function ColumnToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors',
        on ? 'bg-emerald-500/80' : 'bg-muted',
      )}
      aria-hidden
    >
      <span
        className={cn(
          'absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </span>
  )
}
