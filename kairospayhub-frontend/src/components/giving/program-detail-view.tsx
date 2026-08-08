import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Me } from '@/api/me'
import type { ApiClient } from '@/api/client'
import type { Contribution, GivingProgram, GivingProgramRollup } from '@/api/giving'
import {
  approveContribution,
  rejectContribution,
} from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { givingTypeLabel } from '@/lib/giving-ui'
import { ContributionsHistoryTable } from '@/components/giving/contributions-history-table'
import { ContributionsStructureTable } from '@/components/giving/contributions-structure-table'
import { CreateSubPeriodWizard } from '@/components/giving/create-sub-period-wizard'
import { GivingTable } from '@/components/giving/giving-table'
import { LogContributionForm } from '@/components/giving/log-contribution-form'
import { PendingApprovalQueue } from '@/components/giving/pending-approval-queue'
import { ProgramDashboard, type ProgramDetailTab } from '@/components/giving/program-dashboard'
import { ProgramStatusBadge, ScopeKindBadge } from '@/components/giving/giving-badges'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DetailTab = ProgramDetailTab

interface ProgramDetailViewProps {
  me: Me & { onboarded: true }
  api: ApiClient
  tree: StructureTree | null
  program: GivingProgram
  children: GivingProgram[]
  contributions: Contribution[]
  rollup: GivingProgramRollup | null
  onRefresh: () => Promise<void>
  initialTab?: ProgramDetailTab
}

export function ProgramDetailView({
  me,
  api,
  tree,
  program,
  children,
  contributions,
  rollup,
  onRefresh,
  initialTab,
}: ProgramDetailViewProps) {
  const isPastor = me.role === 'Pastor'
  const isFellowshipLeader = me.role === 'FellowshipLeader'
  const isCellLeader = me.role === 'CellLeader'
  const acceptsContributions = program.acceptsContributions
  const [subPeriodOpen, setSubPeriodOpen] = useState(false)

  const pending = useMemo(
    () => contributions.filter((c) => c.status === 'PendingApproval'),
    [contributions],
  )

  const tabs = useMemo(() => {
    const items: { id: DetailTab; label: string; badge?: number }[] = [{ id: 'dashboard', label: 'Dashboard' }]
    if (program.hasChildren || (isPastor && !program.parentProgramId)) {
      items.push({ id: 'subperiods', label: 'Sub-periods', badge: children.length || undefined })
    }
    if ((isFellowshipLeader || isPastor) && pending.length > 0) {
      items.push({ id: 'pending', label: 'Pending', badge: pending.length })
    }
    if (isCellLeader && program.status === 'Open' && acceptsContributions) {
      items.push({ id: 'log', label: 'Log giving' })
    }
    items.push({ id: 'contributions', label: 'Contributions', badge: contributions.length })
    if (contributions.length > 0) {
      items.push({ id: 'history', label: 'History', badge: new Set(contributions.map((c) => c.memberId)).size })
    }
    return items
  }, [
    isPastor,
    isFellowshipLeader,
    isCellLeader,
    pending.length,
    program.status,
    program.hasChildren,
    program.parentProgramId,
    acceptsContributions,
    contributions.length,
    children.length,
  ])

  const [tab, setTab] = useState<DetailTab>(initialTab ?? 'dashboard')

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove(contributionId: string) {
    setBusy(true)
    setError(null)
    try {
      await approveContribution(api, program.id, contributionId)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject(contributionId: string, reason: string | null) {
    setBusy(true)
    setError(null)
    try {
      await rejectContribution(api, program.id, contributionId, reason ?? undefined)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Givings', to: '/givings' },
          { label: program.title },
        ]}
        title={program.title}
        description={`${givingTypeLabel(program.givingType)} · ${program.periodLabel}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isPastor && !program.parentProgramId && (
              <Button type="button" size="sm" onClick={() => setSubPeriodOpen(true)}>
                <Plus className="size-4" />
                Add sub-period
              </Button>
            )}
            <ScopeKindBadge scopeKind={program.scopeKind} />
            <ProgramStatusBadge status={program.status} />
          </div>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <nav className="flex gap-1 overflow-x-auto border-b border-border/60 pb-px">
        {tabs.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {tab === 'dashboard' && (
        <ProgramDashboard
          program={program}
          contributions={contributions}
          rollup={rollup}
          children={children}
          tree={tree}
          pending={pending}
          acceptsContributions={acceptsContributions}
          isPastor={isPastor}
          isFellowshipLeader={isFellowshipLeader}
          isCellLeader={isCellLeader}
          onTabChange={setTab}
        />
      )}

      {tab === 'subperiods' && (
        <div className="space-y-4">
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isPastor
                ? 'No sub-periods yet. Add one to start logging contributions for this campaign.'
                : 'No sub-periods have been created for this campaign yet.'}
            </p>
          ) : (
            <GivingTable rows={children} emptyMessage="No sub-periods yet." />
          )}
        </div>
      )}

      {tab === 'pending' && (
        <PendingApprovalQueue
          contributions={pending}
          canAct={isFellowshipLeader}
          busy={busy}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {tab === 'log' && isCellLeader && program.status === 'Open' && acceptsContributions && (
        <LogContributionForm
          api={api}
          programId={program.id}
          disabled={busy}
          onLogged={() => void onRefresh()}
        />
      )}

      {tab === 'contributions' && (
        <ContributionsStructureTable
          programId={program.id}
          contributions={contributions}
          tree={tree}
        />
      )}

      {tab === 'history' && (
        <ContributionsHistoryTable contributions={contributions} tree={tree} />
      )}

      {isPastor && (
        <CreateSubPeriodWizard
          open={subPeriodOpen}
          onOpenChange={setSubPeriodOpen}
          parent={program}
          api={api}
          tree={tree}
          onCreated={() => void onRefresh()}
        />
      )}
    </div>
  )
}
