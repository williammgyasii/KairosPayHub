import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coins,
  Layers,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react'
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
import type { Contribution, GivingProgram, GivingProgramRollup } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { buildContributionStructureTree, selectRollupBreakdownRows, type ContributionStructureOptions } from '@/lib/contribution-structure'
import { scopeKindLabel } from '@/lib/giving-ui'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ProgramDetailTab =
  | 'dashboard'
  | 'subgivings'
  | 'pending'
  | 'log'
  | 'contributions'
  | 'history'

interface ProgramDashboardProps {
  program: GivingProgram
  contributions: Contribution[]
  rollup: GivingProgramRollup | null
  children: GivingProgram[]
  tree: StructureTree | null
  pending: Contribution[]
  acceptsContributions: boolean
  isPastor: boolean
  isFellowshipLeader: boolean
  isCellLeader: boolean
  structureOptions?: ContributionStructureOptions
  onTabChange: (tab: ProgramDetailTab) => void
}

const BAR_COLORS = [
  'hsl(var(--primary))',
  'oklch(0.62 0.14 264 / 0.85)',
  'oklch(0.58 0.12 200 / 0.8)',
  'oklch(0.55 0.1 280 / 0.75)',
]

export function ProgramDashboard({
  program,
  contributions,
  rollup,
  children,
  tree,
  pending,
  acceptsContributions,
  isPastor,
  isFellowshipLeader,
  isCellLeader,
  structureOptions,
  onTabChange,
}: ProgramDashboardProps) {
  const stats = useMemo(() => {
    const approved = contributions.filter((c) => c.status === 'Approved')
    const rejected = contributions.filter((c) => c.status === 'Rejected')
    const approvedTotal =
      rollup?.totalApprovedAmount ??
      approved.reduce((sum, c) => sum + c.amount, 0)

    return {
      approvedTotal,
      approvedCount: rollup?.totalApprovedCount ?? approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      paymentCount: contributions.length,
      memberCount: new Set(contributions.map((c) => c.memberId)).size,
    }
  }, [contributions, pending.length, rollup])

  const structureBreakdown = useMemo(() => {
    if (rollup && rollup.rows.length > 0) {
      const source = selectRollupBreakdownRows(rollup.rows, tree, structureOptions)
      return source
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8)
        .map((row) => ({
          name: row.nodeName,
          amount: row.totalAmount,
          count: row.contributionCount,
        }))
    }

    const roots = buildContributionStructureTree(tree, contributions, structureOptions)
    return roots
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
        .slice(0, 6),
    [contributions],
  )

  const maxStructureAmount = Math.max(...structureBreakdown.map((r) => r.amount), 1)
  const hasRollupDescendants = rollup?.includesDescendants ?? false
  const isOpen = program.status === 'Open'

  return (
    <div className="space-y-8">
      {/* Hero metrics */}
      <section className="animate-fade-up relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-primary/[0.04] to-transparent px-6 py-6 sm:px-8 sm:py-7">
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl animate-soft-pulse"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-primary/5 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              <Sparkles className="size-3.5" />
              {isOpen ? 'Live campaign' : 'Closed campaign'}
              <span className="text-muted-foreground">·</span>
              {scopeKindLabel(program.scopeKind)}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved giving</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {formatAmount(stats.approvedTotal)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasRollupDescendants
                  ? 'Rolled up from sub givings in your scope'
                  : `${stats.approvedCount} approved payment${stats.approvedCount === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            <HeroStat
              icon={Clock3}
              label="Pending"
              value={String(stats.pendingCount)}
              highlight={stats.pendingCount > 0}
              onClick={stats.pendingCount > 0 ? () => onTabChange('pending') : undefined}
            />
            <HeroStat
              icon={Users}
              label="Members"
              value={String(stats.memberCount)}
              onClick={stats.memberCount > 0 ? () => onTabChange('history') : undefined}
            />
            <HeroStat icon={Coins} label="Payments" value={String(stats.paymentCount)} />
            <HeroStat
              icon={CheckCircle2}
              label="Status"
              value={isOpen ? 'Open' : 'Closed'}
              valueClassName={isOpen ? 'text-emerald-600 dark:text-emerald-400' : undefined}
            />
          </div>
        </div>
      </section>

      {!acceptsContributions && (
        <div
          className="animate-fade-up flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] to-transparent px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: '60ms' }}
        >
          <p className="text-sm text-muted-foreground">
            This campaign uses <strong className="text-foreground">sub givings</strong> for logging.
            {children.length > 0
              ? ' Open a sub-giving below to see live contributions.'
              : isPastor
                ? ' Add a sub-giving to start collecting.'
                : ' Ask your pastor or create an internal sub-giving for your unit.'}
          </p>
          {children.length > 0 && (
            <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
              <Link to={`/givings/${children[0].id}`}>
                Open {children[0].title}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        {/* Structure + chart */}
        <section
          className="animate-fade-up space-y-6 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/20 to-transparent p-5 sm:p-6"
          style={{ animationDelay: '90ms' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h2 className="text-base font-semibold tracking-tight">Structure breakdown</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {structureBreakdown.length > 0
                  ? 'Approved giving by unit'
                  : 'Totals appear once contributions are approved'}
              </p>
            </div>
            {contributions.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="text-primary" asChild>
                <Link to={`/givings/${program.id}?tab=contributions`}>
                  Drill down
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {structureBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No approved giving to chart yet.</p>
          ) : (
            <>
              <div className="h-[200px] w-full sm:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={structureBreakdown} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="givingBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={structureBreakdown.length > 3 ? -18 : 0}
                      textAnchor={structureBreakdown.length > 3 ? 'end' : 'middle'}
                      height={structureBreakdown.length > 3 ? 52 : 28}
                    />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      formatter={(value) => formatAmount(Number(value ?? 0))}
                      contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid hsl(var(--border))' }}
                      cursor={{ fill: 'hsl(var(--primary) / 0.06)' }}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {structureBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={index === 0 ? 'url(#givingBar)' : BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <ul className="divide-y divide-border/40">
                {structureBreakdown.map((row, index) => (
                  <li
                    key={row.name}
                    className="group flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                    style={{ animationDelay: `${120 + index * 40}ms` }}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary transition-transform group-hover:scale-105">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium">{row.name}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatAmount(row.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700 ease-out"
                          style={{ width: `${(row.amount / maxStructureAmount) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.count} payment{row.count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Sidebar rail */}
        <aside className="space-y-4" style={{ animationDelay: '120ms' }}>
          {children.length > 0 && (
            <Panel title="Sub givings" description={`${children.length} active`} className="animate-fade-up">
              <ul className="space-y-1.5">
                {children.slice(0, 6).map((child, index) => (
                  <li key={child.id}>
                    <Link
                      to={`/givings/${child.id}`}
                      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-primary/[0.07] hover:pl-4"
                      style={{ animationDelay: `${140 + index * 30}ms` }}
                    >
                      <span className="font-medium group-hover:text-primary">{child.title}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
              {children.length > 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-muted-foreground"
                  onClick={() => onTabChange('subgivings')}
                >
                  View all sub givings
                </Button>
              )}
            </Panel>
          )}

          {(isFellowshipLeader || isPastor) && stats.pendingCount > 0 && (
            <Panel
              title="Needs approval"
              description={`${stats.pendingCount} waiting`}
              className="animate-fade-up border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent"
            >
              <Button type="button" className="w-full" onClick={() => onTabChange('pending')}>
                Open approval queue
              </Button>
            </Panel>
          )}

          {isCellLeader && isOpen && acceptsContributions && (
            <Panel title="Log a payment" description="Submit with screenshot proof" className="animate-fade-up">
              <Button type="button" className="w-full" onClick={() => onTabChange('log')}>
                Log giving
              </Button>
            </Panel>
          )}

          {stats.rejectedCount > 0 && (
            <Panel title="Rejected" className="animate-fade-up">
              <div className="flex items-center gap-3">
                <XCircle className="size-5 text-destructive" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{stats.rejectedCount}</p>
                  <p className="text-xs text-muted-foreground">Sent back for correction</p>
                </div>
              </div>
            </Panel>
          )}
        </aside>
      </div>

      {/* Recent activity */}
      <section
        className="animate-fade-up overflow-hidden rounded-2xl border border-border/50"
        style={{ animationDelay: '150ms' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/15 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Recent activity</h2>
            <p className="text-sm text-muted-foreground">Latest logged payments</p>
          </div>
          {recent.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onTabChange('contributions')}>
              See all
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
            {acceptsContributions
              ? 'No contributions logged yet. Cell leaders can log payments from the Log giving tab.'
              : 'Open an approved sub-giving to start logging contributions.'}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {recent.map((row, index) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-muted/20 sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:px-6"
                style={{ animationDelay: `${180 + index * 35}ms` }}
              >
                <span className="min-w-0 truncate font-medium">{row.memberName}</span>
                <span className="text-sm text-muted-foreground sm:text-right">
                  {new Date(row.dateSent).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="font-semibold tabular-nums sm:text-right">
                  {formatAmount(row.amount, row.currency)}
                </span>
                <ContributionStatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
  highlight,
  valueClassName,
  onClick,
}: {
  icon: typeof Coins
  label: string
  value: string
  highlight?: boolean
  valueClassName?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <Icon className={cn('size-3.5', highlight ? 'text-amber-600' : 'text-muted-foreground')} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn('mt-1.5 text-xl font-semibold tabular-nums tracking-tight', valueClassName)}>
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
          'rounded-xl border border-border/40 bg-background/70 px-3 py-2.5 text-left backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-background hover:shadow-sm',
          highlight && 'border-amber-500/30 bg-amber-500/[0.06]',
        )}
      >
        {inner}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border/40 bg-background/70 px-3 py-2.5 backdrop-blur-sm',
        highlight && 'border-amber-500/30 bg-amber-500/[0.06]',
      )}
    >
      {inner}
    </div>
  )
}

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-muted/10 p-4 backdrop-blur-[2px]',
        className,
      )}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}
