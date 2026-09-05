import { useMemo, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, HandCoins, Layers, ListChecks } from 'lucide-react'
import type { Contribution, GivingProgram, GivingProgramRollup } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import {
  buildContributionStructureTree,
  selectRollupBreakdownRows,
  type ContributionStructureOptions,
} from '@/lib/contribution-structure'
import { formatGivingDate } from '@/lib/giving-ui'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ProgramDetailTab =
  | 'dashboard'
  | 'subgivings'
  | 'pending'
  | 'approved'
  | 'contributions'
  | 'history'

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
  isCellLeader: boolean
  viewerRole: string
  structureOptions?: ContributionStructureOptions
  onTabChange: (tab: ProgramDetailTab) => void
  onLogGiving?: () => void
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
  isCellLeader,
  viewerRole,
  structureOptions,
  onTabChange,
  onLogGiving,
}: ProgramDashboardProps) {
  const stats = useMemo(() => {
    const approved = contributions.filter((c) => c.status === 'Approved')
    const rejected = contributions.filter((c) => c.status === 'Rejected')
    const approvedTotal =
      rollup?.totalApprovedAmount ?? approved.reduce((sum, c) => sum + c.amount, 0)

    return {
      approvedTotal,
      approvedCount: rollup?.totalApprovedCount ?? approved.length,
      pendingCount: pending.length,
      awaitingOthersCount: Math.max(0, allPending.length - pending.length),
      rejectedCount: rejected.length,
    }
  }, [contributions, pending.length, allPending.length, rollup])

  const structureBreakdown = useMemo(() => {
    if (rollup && rollup.rows.length > 0) {
      return selectRollupBreakdownRows(rollup.rows, tree, structureOptions)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8)
        .map((row) => ({
          name: row.nodeName,
          amount: row.totalAmount,
          count: row.contributionCount,
        }))
    }

    return buildContributionStructureTree(tree, contributions, structureOptions)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8)
      .map((row) => ({
        name: row.name,
        amount: row.totalAmount,
        count: row.paymentCount,
      }))
  }, [rollup, tree, contributions, structureOptions])

  const recent = useMemo(
    () =>
      [...contributions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [contributions],
  )

  const maxStructureAmount = Math.max(...structureBreakdown.map((r) => r.amount), 1)
  const hasRollupDescendants = rollup?.includesDescendants ?? false
  const isOpen = program.status === 'Open'
  const canLog =
    (isCellLeader || isFellowshipLeader || isPfccManager) && isOpen && acceptsContributions
  const showSubGivings = program.hasChildren || !program.parentProgramId

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Approved total
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
            {formatAmount(stats.approvedTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasRollupDescendants
              ? 'Includes sub givings in scope'
              : `${stats.approvedCount} approved`}
          </p>
        </div>
        <Kpi
          label="Pending"
          value={String(stats.pendingCount)}
          icon={Clock3}
          highlight={stats.pendingCount > 0}
          onClick={stats.pendingCount > 0 ? () => onTabChange('pending') : undefined}
        />
        <Kpi
          label="Status"
          value={isOpen ? 'Open' : 'Closed'}
          icon={CheckCircle2}
          valueClassName={isOpen ? 'text-emerald-600 dark:text-emerald-400' : undefined}
        />
      </section>

      {!acceptsContributions && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {isOpen
              ? 'Contributions are not open on this campaign yet.'
              : 'This campaign is closed — reopen it to log new contributions.'}
          </p>
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
                Approved giving across your structure
              </p>
            </div>
            {contributions.length > 0 && (
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
          {(canLog || stats.pendingCount > 0 || isPastor || showSubGivings) && (
            <section className="rounded-xl border border-border/60 bg-background p-4">
              <h2 className="text-sm font-semibold tracking-tight">Quick actions</h2>
              <div className="mt-3 flex flex-col gap-2">
                {canLog && onLogGiving && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={onLogGiving}
                  >
                    <HandCoins className="size-4 shrink-0 opacity-80" />
                    Log giving
                  </Button>
                )}
                {stats.pendingCount > 0 && (isFellowshipLeader || isPfccManager || isPastor) && (
                  <Button
                    type="button"
                    size="sm"
                    variant={stats.pendingCount > 0 ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => onTabChange('pending')}
                  >
                    <ListChecks className="size-4 shrink-0 opacity-80" />
                    Review pending ({stats.pendingCount})
                  </Button>
                )}
                {showSubGivings && children.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => onTabChange('subgivings')}
                  >
                    <Layers className="size-4 shrink-0 opacity-80" />
                    Sub-campaigns ({children.length})
                  </Button>
                )}
                {isPastor && stats.awaitingOthersCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => onTabChange('contributions')}
                  >
                    <ArrowRight className="size-4 shrink-0 opacity-80" />
                    Pipeline ({stats.awaitingOthersCount})
                  </Button>
                )}
              </div>
            </section>
          )}

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

      <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Recent activity</h2>
            <p className="text-xs text-muted-foreground">Latest logged payments</p>
          </div>
          {recent.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onTabChange('contributions')}>
              See all
            </Button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {acceptsContributions
              ? 'No contributions yet — use Log giving to add one.'
              : 'Contributions are not open on this campaign yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {recent.map((row) => (
              <li
                key={row.id}
                className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4"
              >
                <span className="min-w-0 truncate font-medium">{row.memberName}</span>
                <span className="text-muted-foreground">{formatGivingDate(row.dateSent)}</span>
                <span className="font-semibold tabular-nums">{formatAmount(row.amount, row.currency)}</span>
                <ContributionStatusBadge
                  status={row.status}
                  viewerRole={viewerRole}
                  pendingApproverRole={row.pendingApproverRole}
                />
              </li>
            ))}
          </ul>
        )}
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
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
