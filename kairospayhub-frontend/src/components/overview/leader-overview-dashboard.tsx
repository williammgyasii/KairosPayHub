import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckCircle2, ClipboardCheck, Clock3, Coins, Gift, Network, Users } from 'lucide-react'
import type { GivingDashboard } from '@/features/giving/api'
import { formatAmount } from '@/features/giving/api'
import type { ChurchRole } from '@/api/auth'
import type { StructureTree } from '@/api/structure'
import { DistributionPieChart } from '@/components/overview/distribution-pie-chart'
import {
  cellBreakdownRows,
  dashboardQuickStats,
  dashboardQuickStatsForCellLeader,
  dashboardQuickStatsForFellowshipLeader,
  fellowshipBreakdown,
  membersByCellChart,
  membersByFellowshipChart,
  structureLayerChartData,
  structureLayerChartDataForFellowshipLeader,
} from '@/lib/structure-dashboard'
import { givingTypeLabel } from '@/features/giving/lib/giving-ui'
import { DashboardCalendarPanel } from '@/components/overview/dashboard-calendar-panel'
import { Button } from '@/shared/ui/button'
import { initials } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'

function ScopedMembersSnapshot({ tree }: { tree: StructureTree }) {
  const members = tree.members.slice(0, 8)

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Your members</h2>
            <p className="text-xs text-muted-foreground">{tree.members.length} on roster</p>
          </div>
        </div>
        <Link
          to="/roster/membership"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <ul className="max-h-80 divide-y divide-border/40 overflow-y-auto">
        {members.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No members in your scope yet.
          </li>
        ) : (
          members.map((member) => (
            <li key={member.id} className="min-w-0">
              <Link
                to="/roster/membership"
                className="flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.phone ?? member.email ?? 'No contact on file'}
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn('rounded-xl border border-border/60 bg-background p-5', className)}
    >
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 h-[240px] w-full">{children}</div>
    </section>
  )
}

export function LeaderOverviewDashboard({
  tree,
  dashboard,
  role,
}: {
  tree: StructureTree
  dashboard: GivingDashboard
  role: ChurchRole | 'Leader'
}) {
  const isFellowshipLeader = role === 'FellowshipLeader'
  const isCellLeader = role === 'CellLeader'
  const isPfccManager = role === 'PFCCManager'
  const showCalendarSidebar = isFellowshipLeader || isCellLeader || isPfccManager
  const unitName = dashboard.scopeUnitName ?? 'Your unit'
  const layerData = isFellowshipLeader
    ? structureLayerChartDataForFellowshipLeader(tree)
    : structureLayerChartData(tree)
  const distributionData = isFellowshipLeader
    ? membersByCellChart(tree)
    : membersByFellowshipChart(tree)
  const quickStats = isFellowshipLeader
    ? dashboardQuickStatsForFellowshipLeader(tree)
    : isCellLeader
      ? dashboardQuickStatsForCellLeader(tree)
      : dashboardQuickStats(tree)
  const fellowshipRows = fellowshipBreakdown(tree)
  const cellRows = cellBreakdownRows(tree)

  const kpis = isCellLeader
    ? [
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
    : isFellowshipLeader
    ? [
        {
          label: 'Cells',
          value: dashboard.cellCount ?? 0,
          icon: Network,
        },
        {
          label: 'Members',
          value: dashboard.memberCount ?? 0,
          icon: Users,
        },
        {
          label: 'Pending approval',
          value: dashboard.pendingApprovalCount ?? 0,
          icon: Clock3,
          highlight: (dashboard.pendingApprovalCount ?? 0) > 0,
        },
        {
          label: 'Approved giving',
          value: formatAmount(dashboard.scopedApprovedTotal ?? 0),
          icon: CheckCircle2,
        },
      ]
    : [
        {
          label: 'Fellowships',
          value: dashboard.fellowshipCount ?? 0,
          icon: Network,
        },
        {
          label: 'Cells',
          value: dashboard.cellCount ?? 0,
          icon: Network,
        },
        {
          label: 'Members',
          value: dashboard.memberCount ?? 0,
          icon: Users,
        },
        {
          label: 'Pending approval',
          value: dashboard.pendingApprovalCount ?? 0,
          icon: Clock3,
          highlight: (dashboard.pendingApprovalCount ?? 0) > 0,
        },
        {
          label: 'Approved giving',
          value: formatAmount(dashboard.scopedApprovedTotal ?? 0),
          icon: CheckCircle2,
        },
      ]

  return (
    <div
      className={cn(
        'grid gap-5',
        showCalendarSidebar &&
          'lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_20rem]',
      )}
    >
      <div className="min-w-0 space-y-6">
      <section
        className={cn(
          'grid grid-cols-2 gap-4',
          isCellLeader ? 'lg:grid-cols-3' : isFellowshipLeader ? 'lg:grid-cols-4' : 'lg:grid-cols-5',
        )}
      >
        {kpis.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className={cn(
                'rounded-xl border border-border/60 bg-background px-4 py-4',
                metric.highlight && 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20',
              )}
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

      {isCellLeader ? (
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
                  <Link to="/attendance/submissions">Mark attendance</Link>
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
      ) : null}

      {isCellLeader ? (
        <ScopedMembersSnapshot tree={tree} />
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={isFellowshipLeader ? 'Your roster' : 'Structure in your scope'}
          description={
            isFellowshipLeader
              ? 'Cells and members under your leadership'
              : `Units under ${unitName}`
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={layerData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
              <XAxis dataKey="layer" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {layerData.map((entry) => (
                  <Cell key={entry.layer} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={isFellowshipLeader ? 'Members by cell' : 'Members by fellowship'}
          description={
            isFellowshipLeader
              ? 'How members are spread across your cells'
              : 'Roster split across fellowships'
          }
        >
          {distributionData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No members in your scope yet.
            </div>
          ) : (
            <DistributionPieChart data={distributionData} innerRadius={52} outerRadius={88} />
          )}
        </ChartCard>
      </div>
      )}

      <section className="rounded-xl border border-border/60 bg-background p-5">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Open campaigns in your scope</h2>
            <p className="text-xs text-muted-foreground">
              Approved totals from contributions under {unitName}
            </p>
          </div>
        </div>
        {dashboard.campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {isCellLeader
              ? 'No approved giving from your cell yet. Log contributions on an open campaign and they will appear here once approved.'
              : 'No approved giving in your scope yet. When cell leaders log contributions and they are approved, totals appear here.'}
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
                    {campaign.subPeriodCount > 0
                      ? ` · ${campaign.subPeriodCount} sub-period${campaign.subPeriodCount === 1 ? '' : 's'}`
                      : ''}
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {isFellowshipLeader ? (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
          <div className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Cell breakdown</h2>
            <p className="text-xs text-muted-foreground">Members registered in each cell</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/10 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Cell</th>
                  <th className="px-5 py-2.5 font-medium">Members</th>
                </tr>
              </thead>
              <tbody>
                {cellRows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-8 text-muted-foreground">
                      No cells in your roster yet.
                    </td>
                  </tr>
                ) : (
                  cellRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3 font-medium">{row.name}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{row.members}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : isCellLeader ? null : (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
          <div className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Fellowship breakdown</h2>
            <p className="text-xs text-muted-foreground">Cells and members per fellowship</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/10 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Fellowship</th>
                  <th className="px-5 py-2.5 font-medium">Cells</th>
                  <th className="px-5 py-2.5 font-medium">Members</th>
                </tr>
              </thead>
              <tbody>
                {fellowshipRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-muted-foreground">
                      No fellowships in your scope yet.
                    </td>
                  </tr>
                ) : (
                  fellowshipRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3 font-medium">{row.name}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{row.cells}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{row.members}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      </div>

      {showCalendarSidebar ? (
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DashboardCalendarPanel scopeLabel={unitName} />
        </aside>
      ) : null}
    </div>
  )
}
