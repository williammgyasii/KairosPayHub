import { useEffect, useMemo, useState } from 'react'
import type { Me } from '@/api/me'
import type { ApiClient } from '@/api/client'
import type { Contribution, GivingProgram, GivingProgramRollup } from '@/api/giving'
import {
  approveContribution,
  rejectContribution,
} from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { givingTypeLabel } from '@/lib/giving-ui'
import { isPastor, isScopedLeader } from '@/api/me'
import { structureOptionsForLeader } from '@/lib/contribution-structure'
import { ContributionsHistoryTable } from '@/components/giving/contributions-history-table'
import { ContributionsStructureTable } from '@/components/giving/contributions-structure-table'
import { CreateSubPeriodWizard } from '@/components/giving/create-sub-period-wizard'
import { LogContributionForm } from '@/components/giving/log-contribution-form'
import { PendingApprovalQueue } from '@/components/giving/pending-approval-queue'
import { ProgramDashboard, type ProgramDetailTab } from '@/components/giving/program-dashboard'
import { ProgramStatusBadge, ScopeKindBadge } from '@/components/giving/giving-badges'
import { SubGivingsPanel } from '@/components/giving/sub-givings-panel'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
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
  const isPastorRole = isPastor(me.role)
  const isScopedLeaderRole = isScopedLeader(me.role)
  const isFellowshipLeader = me.role === 'FellowshipLeader'
  const isCellLeader = me.role === 'CellLeader'
  const acceptsContributions = program.acceptsContributions
  const [subGivingOpen, setSubGivingOpen] = useState(false)
  const structureOptions = useMemo(
    () => structureOptionsForLeader(me.role, me.scopeNodeId),
    [me.role, me.scopeNodeId],
  )

  const pendingContributions = useMemo(
    () => contributions.filter((c) => c.status === 'PendingApproval'),
    [contributions],
  )

  const pendingSubGivingsCount = useMemo(
    () => children.filter((c) => c.approvalStatus === 'PendingPastorApproval').length,
    [children],
  )

  const tabs = useMemo(() => {
    const items: { id: DetailTab; label: string; badge?: number }[] = [{ id: 'dashboard', label: 'Dashboard' }]
    if (program.hasChildren || !program.parentProgramId) {
      const badge = isPastorRole
        ? pendingSubGivingsCount || children.length || undefined
        : children.length || undefined
      items.push({ id: 'subgivings', label: 'Sub givings', badge })
    }
    if ((isFellowshipLeader || isPastorRole) && pendingContributions.length > 0) {
      items.push({ id: 'pending', label: 'Pending', badge: pendingContributions.length })
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
    isPastorRole,
    isFellowshipLeader,
    isCellLeader,
    pendingContributions.length,
    pendingSubGivingsCount,
    program.status,
    program.hasChildren,
    program.parentProgramId,
    acceptsContributions,
    contributions.length,
    children.length,
  ])

  const [tab, setTab] = useState<DetailTab>(initialTab ?? 'dashboard')

  // ProgramDetailPage keeps this component mounted when only :programId changes,
  // so reset tab when switching campaigns (e.g. parent sub-givings → leaf sub-giving).
  useEffect(() => {
    setTab((current) => {
      if (initialTab && tabs.some((item) => item.id === initialTab)) return initialTab
      if (tabs.some((item) => item.id === current)) return current
      return 'dashboard'
    })
  }, [program.id, initialTab, tabs])
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
          pending={pendingContributions}
          acceptsContributions={acceptsContributions}
          isPastor={isPastorRole}
          isFellowshipLeader={isFellowshipLeader}
          isCellLeader={isCellLeader}
          structureOptions={structureOptions}
          onTabChange={setTab}
        />
      )}

      {tab === 'subgivings' && (
        <SubGivingsPanel
          meRole={me.role}
          children={children}
          api={api}
          onRefresh={onRefresh}
          onCreateClick={
            (isPastorRole || isScopedLeaderRole) && !program.parentProgramId
              ? () => setSubGivingOpen(true)
              : undefined
          }
        />
      )}

      {tab === 'pending' && (
        <PendingApprovalQueue
          contributions={pendingContributions}
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
          structureOptions={structureOptions}
        />
      )}

      {tab === 'history' && (
        <ContributionsHistoryTable contributions={contributions} tree={tree} />
      )}

      {(isPastorRole || isScopedLeaderRole) && (
        <CreateSubPeriodWizard
          open={subGivingOpen}
          onOpenChange={setSubGivingOpen}
          parent={program}
          api={api}
          tree={tree}
          requiresPastorApproval={!isPastorRole}
          scopeRootNodeId={isScopedLeaderRole ? me.scopeNodeId : null}
          onCreated={() => void onRefresh()}
        />
      )}
    </div>
  )
}
