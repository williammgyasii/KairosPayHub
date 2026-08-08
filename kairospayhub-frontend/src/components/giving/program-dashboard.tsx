import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coins,
  Users,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Contribution, GivingProgram, GivingProgramRollup } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { buildContributionStructureTree } from '@/lib/contribution-structure'
import { scopeKindLabel } from '@/lib/giving-ui'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type ProgramDetailTab =
  | 'dashboard'
  | 'subperiods'
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
  onTabChange: (tab: ProgramDetailTab) => void
}

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
      const pfcRows = rollup.rows.filter((r) => r.layerType === 'PFCC')
      const source = pfcRows.length > 0 ? pfcRows : rollup.rows.filter((r) => r.layerType === 'Fellowship')
      return source
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8)
        .map((row) => ({
          name: row.nodeName,
          amount: row.totalAmount,
          count: row.contributionCount,
        }))
    }

    const roots = buildContributionStructureTree(tree, contributions)
    return roots
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8)
      .map((row) => ({
        name: row.name,
        amount: row.totalAmount,
        count: row.paymentCount,
      }))
  }, [rollup, tree, contributions])

  const recent = useMemo(
    () =>
      [...contributions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [contributions],
  )

  const maxStructureAmount = Math.max(...structureBreakdown.map((r) => r.amount), 1)
  const hasRollupDescendants = rollup?.includesDescendants ?? false

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Coins}
          label="Approved total"
          value={formatAmount(stats.approvedTotal)}
          hint={
            hasRollupDescendants
              ? 'Includes sub-periods'
              : `${stats.approvedCount} approved payment${stats.approvedCount === 1 ? '' : 's'}`
          }
          accent
        />
        <MetricCard
          icon={Clock3}
          label="Pending"
          value={String(stats.pendingCount)}
          hint="Awaiting approval"
          action={
            stats.pendingCount > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => onTabChange('pending')}
              >
                Review queue
              </button>
            ) : undefined
          }
        />
        <MetricCard
          icon={Users}
          label="Members giving"
          value={String(stats.memberCount)}
          hint={`${stats.paymentCount} logged payment${stats.paymentCount === 1 ? '' : 's'}`}
          action={
            stats.memberCount > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => onTabChange('history')}
              >
                View history
              </button>
            ) : undefined
          }
        />
        <MetricCard
          icon={CheckCircle2}
          label="Campaign"
          value={program.status === 'Open' ? 'Open' : 'Closed'}
          hint={scopeKindLabel(program.scopeKind)}
        />
      </div>

      {!acceptsContributions && (
        <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          This campaign uses <strong className="text-foreground">sub-periods</strong> for logging.
          {children.length > 0 ? ' Open a sub-period below to see live contributions.' : ' Add a sub-period to start collecting.'}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Structure breakdown</CardTitle>
              <CardDescription>
                {structureBreakdown.length > 0
                  ? 'Approved giving by top structure units'
                  : 'Totals will appear once contributions are approved'}
              </CardDescription>
            </div>
            {contributions.length > 0 && (
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link to={`/givings/${program.id}?tab=contributions`}>
                  Full drill-down
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {structureBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved giving to chart yet.</p>
            ) : (
              <div className="space-y-5">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={structureBreakdown} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} width={48} />
                      <Tooltip
                        formatter={(value) => formatAmount(Number(value ?? 0))}
                        labelStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2">
                  {structureBreakdown.map((row) => (
                    <li key={row.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{row.name}</span>
                        <span className="shrink-0 tabular-nums">{formatAmount(row.amount)}</span>
                      </div>
                      <Progress value={(row.amount / maxStructureAmount) * 100} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {row.count} payment{row.count === 1 ? '' : 's'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {children.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sub-periods</CardTitle>
                <CardDescription>{children.length} active period{children.length === 1 ? '' : 's'}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {children.slice(0, 5).map((child) => (
                    <li key={child.id}>
                      <Link
                        to={`/givings/${child.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm transition-colors hover:bg-muted/30"
                      >
                        <span className="font-medium">{child.title}</span>
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
                {children.length > 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => onTabChange('subperiods')}
                  >
                    View all sub-periods
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {(isFellowshipLeader || isPastor) && stats.pendingCount > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Needs approval</CardTitle>
                <CardDescription>{stats.pendingCount} waiting on you</CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" className="w-full" onClick={() => onTabChange('pending')}>
                  Open approval queue
                </Button>
              </CardContent>
            </Card>
          )}

          {isCellLeader && program.status === 'Open' && acceptsContributions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Log a payment</CardTitle>
                <CardDescription>Submit member contributions with screenshots</CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" className="w-full" onClick={() => onTabChange('log')}>
                  Log giving
                </Button>
              </CardContent>
            </Card>
          )}

          {stats.rejectedCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <XCircle className="size-4 text-destructive" />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{stats.rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Payments sent back for correction</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest logged payments for this giving</CardDescription>
          </div>
          {recent.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onTabChange('contributions')}>
              See all
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {acceptsContributions
                ? 'No contributions logged yet. Cell leaders can log payments from the Log giving tab.'
                : 'Open a sub-period to start logging contributions.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Member
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{row.memberName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(row.dateSent).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatAmount(row.amount, row.currency)}
                      </td>
                      <td className="px-4 py-2.5">
                        <ContributionStatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  action,
}: {
  icon: typeof Coins
  label: string
  value: string
  hint?: string
  accent?: boolean
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-4',
        accent ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={cn('size-4', accent ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
