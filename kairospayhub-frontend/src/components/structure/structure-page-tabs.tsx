import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StructurePageTab = {
  id: string
  label: string
  count: number
  locked?: boolean
  lockReason?: string
}

interface StructurePageTabsProps {
  tabs: StructurePageTab[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function StructurePageTabs({
  tabs,
  activeId,
  onChange,
  className,
}: StructurePageTabsProps) {
  return (
    <div className={cn('border-b border-border/60', className)}>
      <div className="-mb-px flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const active = tab.id === activeId
          const locked = Boolean(tab.locked)
          return (
            <button
              key={tab.id}
              type="button"
              disabled={locked}
              title={locked ? tab.lockReason : undefined}
              onClick={() => !locked && onChange(tab.id)}
              className={cn(
                'relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                locked && 'cursor-not-allowed opacity-60',
                active && !locked
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground',
                !locked && !active && 'hover:border-border hover:text-foreground',
              )}
            >
              {tab.label}
              {locked ? (
                <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
