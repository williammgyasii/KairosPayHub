import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, Coins, Gift, Users } from 'lucide-react'
import type { GivingDashboard } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { dashboardQuickStatsForCellLeader } from '@/lib/structure-dashboard'
import { givingTypeLabel } from '@/lib/giving-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CellLeaderOverviewDashboard({
  tree,
  dashboard,
}: {
  tree: StructureTree
  dashboard: GivingDashboard
}) {
  const unitName = dashboard.scopeUnitName ?? 'Your cell'
  const quickStats = dashboardQuickStatsForCellLeader(tree)

  const kpis = [
    {
      label: 'Members',
      value: dashboard.memberCount ?? 0,
      icon: Users,
    },
    {
      label: 'Open campaigns',
      value: dashboard.openCampaignCount ?? 0,
      icon: Gift,
    },
    {
      label: 'Approved giving',
      value: formatAmount(dashboard.scopedApprovedTotal ?? 0),
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className="rounded-xl border border-border/60 bg-background px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <Icon className="size-4 text-muted-foreground/70" />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
                {metric.value}
              </p>
            </div>
          )
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background p-5">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 size-4 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold tracking-tight">Attendance</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mark your cell present or absent for each meeting, then submit for approval.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/attendance/submissions">Submit roll call</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-5">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 size-4 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold tracking-tight">Givings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Log member contributions with receipts for open campaigns in your cell.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-4">
                <Link to="/givings">Open givings</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-background p-5">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Campaign totals for {unitName}</h2>
            <p className="text-xs text-muted-foreground">
              Approved contributions logged from your cell
            </p>
          </div>
        </div>
        {dashboard.campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No approved giving from your cell yet. Log contributions on an open campaign and they
            will appear here once approved.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {dashboard.campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <Link
                    to={`/givings/${campaign.id}`}
                    className="truncate font-medium hover:text-primary hover:underline"
                  >
                    {campaign.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {givingTypeLabel(campaign.givingType)} · {campaign.periodLabel}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatAmount(campaign.totalApprovedAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className={cn('rounded-xl border border-border/60 bg-muted/20 px-4 py-3')}
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
