import type { LucideIcon } from 'lucide-react'
import { Church, Layers, Network, Users } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { dashboardMetrics } from '@/lib/structure-dashboard'
import { cn } from '@/lib/utils'

const METRIC_ICONS: Record<string, LucideIcon> = {
  Group: Layers,
  PFCC: Layers,
  Fellowship: Church,
  Cell: Network,
  members: Users,
}

export function OverviewMetrics({
  tree,
  muted,
}: {
  tree: StructureTree | null
  muted?: boolean
}) {
  const metrics = tree ? dashboardMetrics(tree).slice(0, 4) : []

  return (
    <section className={cn(muted && 'opacity-70')}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">At a glance</h2>
        {muted && (
          <p className="text-xs text-muted-foreground">
            Complete structure setup to unlock meaningful counts.
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {metrics.length > 0
          ? metrics.map((metric) => {
              const layer = tree?.template?.layers.find((l) => l.id === metric.key)
              const iconKey =
                metric.key === 'members' ? 'members' : (layer?.standardType ?? 'Cell')
              const Icon = METRIC_ICONS[iconKey] ?? Layers
              return (
                <div key={metric.key} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3.5 shrink-0" />
                    {metric.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
                    {metric.value}
                  </dd>
                </div>
              )
            })
          : ['Layers', 'Nodes', 'Cells', 'Members'].map((label) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
                  —
                </dd>
              </div>
            ))}
      </dl>
    </section>
  )
}
