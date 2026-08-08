import { cn } from '@/lib/utils'

export type StructurePageTab = {
  id: string
  label: string
  count: number
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
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
