import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckCircle2, Clock3, Coins, Network, Users } from 'lucide-react'
import type { GivingDashboard } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import {
  dashboardQuickStats,
  fellowshipBreakdown,
  membersByFellowshipChart,
  structureLayerChartData,
} from '@/lib/structure-dashboard'
import { givingTypeLabel } from '@/lib/giving-ui'
import { cn } from '@/lib/utils'

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
}: {
  tree: StructureTree
  dashboard: GivingDashboard
}) {
  const unitName = dashboard.scopeUnitName ?? 'Your unit'
  const layerData = structureLayerChartData(tree)
  const pieData = membersByFellowshipChart(tree)
  const rows = fellowshipBreakdown(tree)
  const quickStats = dashboardQuickStats(tree)

  const kpis = [
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
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Structure in your scope" description={`Units under ${unitName}`}>
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

        <ChartCard title="Members by fellowship" description="Roster split across fellowships">
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No members in your scope yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="members"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.fullName} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => [
                    value,
                    (props.payload as { fullName: string }).fullName,
                  ]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

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
            No approved giving in your scope yet. When cell leaders log contributions and they are
            approved, totals appear here.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-muted-foreground">
                    No fellowships in your scope yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
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
    </div>
  )
}
