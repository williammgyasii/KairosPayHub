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
import { Church, Layers, Network, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import {
  dashboardMetrics,
  dashboardQuickStats,
  dashboardRecommendations,
  fellowshipBreakdown,
  membersByFellowshipChart,
  structureLayerChartData,
} from '@/lib/structure-dashboard'
import { cn } from '@/lib/utils'

const METRIC_ICONS: Record<string, LucideIcon> = {
  Group: Layers,
  PFCC: Layers,
  Fellowship: Church,
  Cell: Network,
  members: Users,
}

const UPDATES = [
  {
    title: 'Roster',
    body: 'Add PFCCs, fellowships, cells, and members under Structure → Roster.',
    when: 'New',
  },
  {
    title: 'Giving programs',
    body: 'Campaigns and cell-leader contribution entry are up next.',
    when: 'Roadmap',
  },
  {
    title: 'Church branding',
    body: 'Upload your logo in Settings for a branded sidebar.',
    when: 'Tip',
  },
  {
    title: 'Full dashboard',
    body: 'Metrics and charts refresh from your live church structure.',
    when: 'Today',
  },
]

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

export function OverviewDashboard({
  tree,
  churchName,
}: {
  tree: StructureTree
  churchName?: string | null
}) {
  const metrics = dashboardMetrics(tree)
  const layerData = structureLayerChartData(tree)
  const pieData = membersByFellowshipChart(tree)
  const rows = fellowshipBreakdown(tree)
  const tips = dashboardRecommendations(tree)
  const quickStats = dashboardQuickStats(tree)
  const label = churchName?.trim() || 'Your church'

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.slice(0, 4).map((metric) => {
          const layer = tree.template?.layers.find((l) => l.id === metric.key)
          const iconKey = metric.key === 'members' ? 'members' : (layer?.standardType ?? 'Cell')
          const Icon = METRIC_ICONS[iconKey] ?? Layers
          return (
            <div
              key={metric.key}
              className="rounded-xl border border-border/60 bg-background px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <Icon className="size-4 text-muted-foreground/70" />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
                {metric.value}
              </p>
            </div>
          )
        })}
      </section>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Structure layers" description={`Hierarchy size for ${label}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={layerData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.01 255)" />
              <XAxis
                dataKey="layer"
                tick={{ fontSize: 11, fill: 'oklch(0.52 0.02 255)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'oklch(0.52 0.02 255)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid oklch(0.91 0.01 255)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {layerData.map((entry) => (
                  <Cell key={entry.layer} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Members by fellowship"
          description="Share of roster across fellowships"
        >
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Add members to see distribution.
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
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid oklch(0.91 0.01 255)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Quick stats + recommendations */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Fellowship table — 2 cols */}
        <section className="overflow-hidden rounded-xl border border-border/60 bg-background xl:col-span-2">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
            <TrendingUp className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Fellowship breakdown</h2>
              <p className="text-xs text-muted-foreground">Cells and members per fellowship</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/10 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Fellowship</th>
                  <th className="px-5 py-2.5 font-medium">Cells</th>
                  <th className="px-5 py-2.5 font-medium">Members</th>
                  <th className="px-5 py-2.5 font-medium">Fill rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-muted-foreground">
                      No fellowships in structure yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const fillRate =
                      row.cells > 0
                        ? Math.round((row.members / row.cells) * 100)
                        : 0
                    return (
                      <tr key={row.id} className="border-b border-border/40 last:border-0">
                        <td className="px-5 py-3 font-medium">{row.name}</td>
                        <td className="px-5 py-3 tabular-nums text-muted-foreground">
                          {row.cells}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-muted-foreground">
                          {row.members}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                              <div
                                className="h-full rounded-full bg-primary/70"
                                style={{ width: `${Math.min(fillRate, 100)}%` }}
                              />
                            </div>
                            <span className="w-8 text-xs tabular-nums text-muted-foreground">
                              {row.cells > 0 ? `${fillRate}%` : '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Updates */}
        <section className="rounded-xl border border-border/60 bg-background p-5">
          <h2 className="text-sm font-semibold tracking-tight">Latest updates</h2>
          <ul className="mt-4 space-y-3">
            {UPDATES.map((item) => (
              <li
                key={item.title}
                className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                    {item.when}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recommendations full width */}
      <section className="rounded-xl border border-border/60 bg-background p-5">
        <h2 className="text-sm font-semibold tracking-tight">Recommendations</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => (
            <div
              key={tip}
              className="flex gap-2 rounded-lg border border-border/40 px-3 py-2.5 text-sm text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {tip}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function OverviewSetupPreview({ tree }: { tree: StructureTree | null }) {
  if (!tree) return null

  return (
    <section className="rounded-xl border border-border/60 bg-muted/10 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Dashboard preview
      </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Go to Structure to define your layer chain, then add nodes and members in Roster.
        </p>
    </section>
  )
}
