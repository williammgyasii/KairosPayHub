import { cn } from '@/shared/lib/utils'
import type { ProgramDetailTab } from '@/features/giving/components/program-dashboard'

export type ProgramDetailTabItem = {
  id: ProgramDetailTab
  label: string
  badge?: number
}

interface ProgramDetailTabsProps {
  tabs: ProgramDetailTabItem[]
  activeId: ProgramDetailTab
  onChange: (id: ProgramDetailTab) => void
}

export function ProgramDetailTabs({ tabs, activeId, onChange }: ProgramDetailTabsProps) {
  return (
    <div className="grid w-full min-w-0 border-b border-border/60">
      <nav
        aria-label="Campaign sections"
        className="-mb-px flex gap-1 overflow-x-auto overscroll-x-contain pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
