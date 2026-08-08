import type { GivingDashboard, GivingProgram } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import { cn } from '@/lib/utils'

export type GivingTopLevelMetrics = {
  totalApproved: number | null
  openCampaigns: number
  subGivings: number | null
  pendingApprovals: number
  scopeUnitName?: string | null
}

export type GivingCampaignStats = {
  totalApprovedAmount: number
  subGivingCount: number
}

export function deriveGivingMetrics(
  dashboard: GivingDashboard | null,
  givings: GivingProgram[],
): GivingTopLevelMetrics {
  if (dashboard) {
    const totalApproved =
      dashboard.scopedApprovedTotal ??
      dashboard.campaigns.reduce((sum, campaign) => sum + campaign.totalApprovedAmount, 0)

    return {
      totalApproved,
      openCampaigns: dashboard.openCampaignCount,
      subGivings: dashboard.campaigns.reduce((sum, campaign) => sum + campaign.subPeriodCount, 0),
      pendingApprovals: dashboard.pendingApprovalCount ?? 0,
      scopeUnitName: dashboard.scopeUnitName,
    }
  }

  const open = givings.filter((giving) => giving.status === 'Open')
  return {
    totalApproved: null,
    openCampaigns: open.length,
    subGivings: null,
    pendingApprovals: 0,
  }
}

export function campaignStatsByProgramId(
  dashboard: GivingDashboard | null,
): Map<string, GivingCampaignStats> {
  const map = new Map<string, GivingCampaignStats>()
  if (!dashboard) return map

  for (const campaign of dashboard.campaigns) {
    map.set(campaign.id, {
      totalApprovedAmount: campaign.totalApprovedAmount,
      subGivingCount: campaign.subPeriodCount,
    })
  }
  return map
}

export function givingsPageDescription(role: string, scopeUnitName?: string | null) {
  if (role === 'Pastor') {
    return 'Church campaigns at a glance. Open a row to manage sub givings and contributions.'
  }
  if (role === 'PFCCManager' || role === 'FellowshipLeader') {
    return scopeUnitName
      ? `Campaigns and totals for ${scopeUnitName}.`
      : 'Campaigns and totals for your unit.'
  }
  return 'Campaigns you can view or log giving into.'
}

function MetricPill({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'min-w-[7rem] flex-1 rounded-lg border border-border/60 bg-background px-4 py-3',
        highlight && 'border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/25',
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

export function GivingTopMetrics({
  metrics,
  className,
}: {
  metrics: GivingTopLevelMetrics
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border/60 bg-muted/20 px-4 py-4 sm:px-5',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {metrics.scopeUnitName ? metrics.scopeUnitName : 'All campaigns'}
        </p>
        {metrics.totalApproved != null && (
          <p className="text-xs text-muted-foreground">Approved giving only</p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <MetricPill
          label="Approved total"
          value={metrics.totalApproved != null ? formatAmount(metrics.totalApproved) : '—'}
        />
        <MetricPill label="Open campaigns" value={String(metrics.openCampaigns)} />
        <MetricPill
          label="Sub givings"
          value={metrics.subGivings != null ? String(metrics.subGivings) : '—'}
        />
        <MetricPill
          label="Pending review"
          value={String(metrics.pendingApprovals)}
          highlight={metrics.pendingApprovals > 0}
        />
      </div>
    </section>
  )
}
