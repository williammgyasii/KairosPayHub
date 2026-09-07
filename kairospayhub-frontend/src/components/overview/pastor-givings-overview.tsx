import type { ComponentType } from 'react'
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
import { CheckCircle2, Clock3, Coins, HandCoins, Megaphone } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { formatAmount } from '@/api/giving'
import {
  CHART_COLORS,
  membersByFellowshipChart,
} from '@/lib/structure-dashboard'
import { deriveGivingMetrics } from '@/components/giving/giving-metrics'
import { DistributionPieChart } from '@/components/overview/distribution-pie-chart'
import { givingTypeLabel } from '@/lib/giving-ui'
import { useGetGivingDashboardQuery } from '@/store/givingApi'
import { formatRtkQueryError } from '@/store/baseQuery'
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
      className={cn('rounded-xl border border-border/60 bg-background p-4', className)}
    >
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-3 h-[11rem] w-full">{children}</div>
    </section>
  )
}

function GivingKpi({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-background px-3 py-3 sm:px-4 sm:py-3.5',
        highlight && 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-eyebrow">
          {label}
        </p>
        <Icon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{value}</p>
    </div>
  )
}

export function PastorGivingsOverview({ tree }: { tree: StructureTree }) {
  const { data: dashboard, isLoading, error } = useGetGivingDashboardQuery()

  const metrics = deriveGivingMetrics(dashboard ?? null, [])
  const fellowshipData = membersByFellowshipChart(tree)
  const campaignData =
    dashboard?.campaigns.map((campaign, index) => ({
      name: campaign.title.length > 14 ? `${campaign.title.slice(0, 14)}…` : campaign.title,
      fullName: campaign.title,
      amount: campaign.totalApprovedAmount,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    })) ?? []

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-52 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
          <div className="h-52 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-destructive">
        {formatRtkQueryError(error)}
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HandCoins className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Givings</h2>
            <p className="text-xs text-muted-foreground">Church-wide approved totals</p>
          </div>
        </div>
        <Link to="/givings" className="text-xs font-medium text-primary hover:underline">
          View campaigns
        </Link>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10.5rem),1fr))]">
        <GivingKpi
          label="Approved total"
          value={metrics.totalApproved != null ? formatAmount(metrics.totalApproved) : '—'}
          icon={CheckCircle2}
        />
        <GivingKpi
          label="Open campaigns"
          value={String(metrics.openCampaigns)}
          icon={Megaphone}
        />
        <GivingKpi
          label="Pending review"
          value={String(metrics.pendingApprovals)}
          icon={Clock3}
          highlight={metrics.pendingApprovals > 0}
        />
        <GivingKpi
          label="Active campaigns"
          value={String(dashboard?.campaigns.length ?? 0)}
          icon={Coins}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ChartCard
          title="Campaign totals"
          description="Approved giving by open campaign"
        >
          {campaignData.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
              No approved giving yet.{' '}
              <Link to="/givings" className="ml-1 font-medium text-primary hover:underline">
                Start a campaign
              </Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                  }
                />
                <Tooltip
                  formatter={(value) => [formatAmount(Number(value)), 'Approved']}
                  labelFormatter={(_label, payload) =>
                    (payload?.[0]?.payload as { fullName: string } | undefined)?.fullName ?? _label
                  }
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {campaignData.map((entry) => (
                    <Cell key={entry.fullName} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Members by fellowship"
          description="Roster split across fellowships"
        >
          {fellowshipData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No fellowship data yet.
            </div>
          ) : (
            <DistributionPieChart data={fellowshipData} />
          )}
        </ChartCard>
      </div>

      {dashboard && dashboard.campaigns.length > 0 ? (
        <section className="rounded-xl border border-border/60 bg-background">
          <div className="border-b border-border/60 px-4 py-2.5">
            <h3 className="text-sm font-semibold">Recent campaigns</h3>
          </div>
          <ul className="divide-y divide-border/40">
            {dashboard.campaigns.slice(0, 4).map((campaign) => (
              <li key={campaign.id}>
                <Link
                  to={`/givings/${campaign.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{campaign.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {givingTypeLabel(campaign.givingType)} · {campaign.periodLabel}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatAmount(campaign.totalApprovedAmount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  )
}
