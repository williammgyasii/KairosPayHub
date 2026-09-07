import { useMemo, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, Layers } from 'lucide-react'
import type { Contribution, GivingProgram, GivingProgramRollup } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import {
  buildContributionStructureTree,
  selectRollupBreakdownRows,
  type ContributionStructureOptions,
} from '@/lib/contribution-structure'
import { RecentActivityTable } from '@/components/giving/recent-activity-table'
import { groupContributionsForActivity } from '@/lib/contribution-batches'
import { contributionsAwaitingMyApproval } from '@/lib/giving-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ProgramDetailTab =
  | 'dashboard'
  | 'subgivings'
  | 'member-givings'
  | 'transactions'
  | 'pending'
  | 'awaiting'
  | 'approved'
  | 'contributions'
  | 'history'

export function normalizeProgramDetailTab(tab: string | null | undefined): ProgramDetailTab | undefined {
  if (!tab || tab === 'log') return undefined
  if (tab === 'pending' || tab === 'awaiting') return 'transactions'
  if (tab === 'approved') return 'member-givings'
  const allowed: ProgramDetailTab[] = [
    'dashboard',
    'subgivings',
    'member-givings',
    'transactions',
    'contributions',
    'history',
  ]
  return allowed.includes(tab as ProgramDetailTab) ? (tab as ProgramDetailTab) : undefined
}

interface ProgramDashboardProps {
  program: GivingProgram
  contributions: Contribution[]
  rollup: GivingProgramRollup | null
  children: GivingProgram[]
  tree: StructureTree | null
  pending: Contribution[]
  allPending: Contribution[]
  acceptsContributions: boolean
  isPastor: boolean
  isFellowshipLeader: boolean
  isPfccManager: boolean
  viewerRole: string
  structureOptions?: ContributionStructureOptions
  onTabChange: (tab: ProgramDetailTab) => void
  busy?: boolean
  onApproveContribution?: (contributionId: string, programId: string) => Promise<void>
  onRejectContribution?: (contributionId: string, programId: string) => void
}

export function ProgramDashboard({
  program,
  contributions,
  rollup,
  children,
  tree,
  pending,
  allPending,
  acceptsContributions,
  isPastor,
  isFellowshipLeader,
  isPfccManager,
  viewerRole,
  structureOptions,
  onTabChange,
  busy,
  onApproveContribution,
  onRejectContribution,
}: ProgramDashboardProps) {
  const approvedContributions = useMemo(
    () => contributions.filter((c) => c.status === 'Approved'),
    [contributions],
  )

  const stats = useMemo(() => {
    const rejected = contributions.filter((c) => c.status === 'Rejected')
    const approvedTotal =
      rollup?.totalApprovedAmount ??
      approvedContributions.reduce((sum, c) => sum + c.amount, 0)

    return {
      approvedTotal,
      approvedCount: rollup?.totalApprovedCount ?? approvedContributions.length,
      pendingCount: pending.length,
      awaitingCount: allPending.length,
      awaitingOthersCount: Math.max(0, allPending.length - pending.length),
      rejectedCount: rejected.length,
    }
  }, [contributions, approvedContributions, pending.length, allPending.length, rollup])

  const structureBreakdown = useMemo(() => {
    if (rollup && rollup.rows.length > 0) {
      return selectRollupBreakdownRows(rollup.rows, tree, structureOptions)
        .filter((row) => row.totalAmount > 0)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8)
        .map((row) => ({
          name: row.nodeName,
          amount: row.totalAmount,
          count: row.contributionCount,
        }))
    }

    return buildContributionStructureTree(tree, approvedContributions, structureOptions)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8)
      .map((row) => ({
        name: row.name,
        amount: row.totalAmount,
        count: row.paymentCount,
      }))
  }, [rollup, tree, approvedContributions, structureOptions])

  const recent = useMemo(() => {
    const grouped = groupContributionsForActivity(contributions)
    return grouped.slice(0, 8)
  }, [contributions])

  const actionableContributionIds = useMemo(
    () => contributionsAwaitingMyApproval(viewerRole, pending).map((c) => c.id),
    [viewerRole, pending],
  )

  const maxStructureAmount = Math.max(...structureBreakdown.map((r) => r.amount), 1)
  const isOpen = program.status === 'Open'
  const showSubGivings = program.hasChildren || !program.parentProgramId
  const pendingSubGivings = children.filter(
    (child) => child.approvalStatus === 'PendingPastorApproval',
  ).length

  const attentionItems = useMemo(() => {
    const items: { label: string; detail: string; onClick: () => void; highlight?: boolean }[] = []
    if (stats.pendingCount > 0 && (isFellowshipLeader || isPfccManager || isPastor)) {
      items.push({
        label: 'Needs your review',
        detail: `${stats.pendingCount} payment${stats.pendingCount === 1 ? '' : 's'} awaiting your approval`,
        onClick: () => onTabChange('transactions'),
        highlight: true,
      })
    } else if (stats.awaitingCount > 0) {
      items.push({
        label: 'In the pipeline',
        detail: `${stats.awaitingCount} payment${stats.awaitingCount === 1 ? '' : 's'} awaiting approval`,
        onClick: () => onTabChange('transactions'),
      })
    }
    if (isPastor && pendingSubGivings > 0) {
      items.push({
        label: 'Sub-campaigns pending',
        detail: `${pendingSubGivings} sub-campaign${pendingSubGivings === 1 ? '' : 's'} need pastor approval`,
        onClick: () => onTabChange('subgivings'),
        highlight: true,
      })
    }
    if (showSubGivings && children.length > 0) {
      items.push({
        label: 'Sub-campaigns',
        detail: `${children.length} active under this campaign`,
        onClick: () => onTabChange('subgivings'),
      })
    }
    if (!isOpen) {
      items.push({
        label: 'Campaign closed',
        detail: 'Reopen to accept new giving logs',
        onClick: () => onTabChange('dashboard'),
      })
    }
    return items
  }, [
    stats.pendingCount,
    stats.awaitingCount,
    isFellowshipLeader,
    isPfccManager,
    isPastor,
    pendingSubGivings,
    showSubGivings,
    children.length,
    isOpen,
    onTabChange,
  ])

  return (
    <div className="grid w-full min-w-0 gap-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-eyebrow">
            Approved total
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
            {formatAmount(stats.approvedTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.approvedCount} approved payment{stats.approvedCount === 1 ? '' : 's'}
          </p>
        </div>
        <Kpi
          label="Awaiting approval"
          value={String(stats.awaitingCount)}
          icon={Clock3}
          highlight={stats.awaitingCount > 0}
          onClick={stats.awaitingCount > 0 ? () => onTabChange('transactions') : undefined}
        />
        <Kpi
          label="Approved payments"
          value={String(stats.approvedCount)}
          icon={CheckCircle2}
          onClick={
            stats.approvedCount > 0 ? () => onTabChange('member-givings') : undefined
          }
        />
      </section>

      {!acceptsContributions && (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {program.status === 'Scheduled'
            ? 'This campaign is scheduled — logging opens when it goes live.'
            : 'This campaign is closed — reopen it to log new contributions.'}
        </div>
      )}

      {acceptsContributions && children.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Log to this campaign for general giving, or open a{' '}
            <strong className="text-foreground">sub-campaign</strong> for a specific date or period.
          </p>
          {showSubGivings && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => onTabChange('subgivings')}
            >
              <Layers className="size-3.5" />
              Sub-campaigns ({children.length})
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="space-y-4 rounded-xl border border-border/60 bg-background p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">By unit</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Approved giving only — pending logs are not counted here
              </p>
            </div>
            {approvedContributions.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="h-8 text-primary" asChild>
                <Link to={`/givings/${program.id}?tab=contributions`}>
                  Full breakdown
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {structureBreakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No approved giving yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {structureBreakdown.map((row) => (
                <li key={row.name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{row.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatAmount(row.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${(row.amount / maxStructureAmount) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.count} payment{row.count === 1 ? '' : 's'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border/60 bg-background p-4">
            <h2 className="text-sm font-semibold tracking-tight">Needs attention</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              What to review next on this campaign
            </p>
            {attentionItems.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You&apos;re caught up — nothing waiting right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {attentionItems.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={cn(
                        'flex w-full flex-col rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/20',
                        item.highlight
                          ? 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20'
                          : 'border-border/60',
                      )}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="mt-0.5 text-xs text-muted-foreground">{item.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {children.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-background p-4">
              <h2 className="text-sm font-semibold tracking-tight">Sub givings</h2>
              <ul className="mt-2 divide-y divide-border/40">
                {children.slice(0, 5).map((child) => (
                  <li key={child.id}>
                    <Link
                      to={`/givings/${child.id}`}
                      className="flex items-center justify-between gap-2 py-2.5 text-sm transition-colors hover:text-primary"
                    >
                      <span className="min-w-0 truncate font-medium">{child.title}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatAmount(child.totalApprovedAmount ?? 0)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <section className="min-w-0 rounded-xl border border-border/60 bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">Recent activity</h2>
            <p className="text-xs text-muted-foreground">
              Latest logs — pending amounts are not part of approved totals yet
            </p>
          </div>
        </div>

        <RecentActivityTable
          rows={recent}
          viewerRole={viewerRole}
          emptyMessage={
            acceptsContributions
              ? 'No contributions yet — use Log giving to add one.'
              : 'Contributions are not open on this campaign yet.'
          }
          actionableContributionIds={actionableContributionIds}
          busy={busy}
          onApprove={onApproveContribution}
          onReject={onRejectContribution}
          onSeeAll={
            recent.length > 0
              ? () =>
                  onTabChange(
                    recent.some((row) =>
                      row.kind === 'batch'
                        ? row.contributions.some((c) => c.status === 'PendingApproval')
                        : row.contribution.status === 'PendingApproval',
                    )
                      ? 'transactions'
                      : 'member-givings',
                  )
              : undefined
          }
        />
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  highlight,
  valueClassName,
  onClick,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  highlight?: boolean
  valueClassName?: string
  onClick?: () => void
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-eyebrow">
          {label}
        </p>
        <Icon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      </div>
      <p className={cn('mt-2 text-xl font-semibold tabular-nums tracking-tight', valueClassName)}>
        {value}
      </p>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'rounded-xl border border-border/60 bg-background px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/20',
          highlight && 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20',
        )}
      >
        {body}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-background px-3 py-3',
        highlight && 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20',
      )}
    >
      {body}
    </div>
  )
}
