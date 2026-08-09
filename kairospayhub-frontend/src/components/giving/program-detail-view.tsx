import { useEffect, useMemo, useState } from 'react'
import type { Me } from '@/api/me'
import type { ApiClient } from '@/api/client'
import type { Contribution, ContributionListSummary, GivingProgram, GivingProgramRollup } from '@/api/giving'
import {
  approveContribution,
  approveSubGiving,
  rejectContribution,
  rejectSubGiving,
} from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { givingTypeLabel, contributionsAwaitingMyApproval } from '@/lib/giving-ui'
import { canCreateSubGiving, canManageChurch } from '@/api/me'
import { structureOptionsForLeader } from '@/lib/contribution-structure'
import { ContributionsHistoryTable } from '@/components/giving/contributions-history-table'
import { ContributionsStructureTable } from '@/components/giving/contributions-structure-table'
import { ContributionsApprovalTable } from '@/components/giving/contributions-approval-table'
import { CreateSubPeriodWizard } from '@/components/giving/create-sub-period-wizard'
import { LogContributionWizard } from '@/components/giving/log-contribution-wizard'
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
  contributionSummary: ContributionListSummary | null
  rollup: GivingProgramRollup | null
  onRefresh: () => Promise<void>
  onRefreshChildren?: () => Promise<void>
  initialTab?: ProgramDetailTab
}

export function ProgramDetailView({
  me,
  api,
  tree,
  program,
  children,
  contributions,
  contributionSummary,
  rollup,
  onRefresh,
  onRefreshChildren,
  initialTab,
}: ProgramDetailViewProps) {
  const churchManager = canManageChurch(me.role)
  const canCreateSubGivingRole = canCreateSubGiving(me.role)
  const isFellowshipLeader = me.role === 'FellowshipLeader'
  const isPfccManager = me.role === 'PFCCManager'
  const isCellLeader = me.role === 'CellLeader'
  const acceptsContributions = program.acceptsContributions
  const canLogContributions =
    (isCellLeader || isFellowshipLeader || isPfccManager) &&
    program.status === 'Open' &&
    acceptsContributions
  const [subGivingOpen, setSubGivingOpen] = useState(false)
  const structureOptions = useMemo(
    () => structureOptionsForLeader(me.role, me.scopeNodeId),
    [me.role, me.scopeNodeId],
  )

  const pendingContributions = useMemo(
    () => contributions.filter((c) => c.status === 'PendingApproval'),
    [contributions],
  )

  const myPendingContributions = useMemo(
    () => contributionsAwaitingMyApproval(me.role, pendingContributions),
    [me.role, pendingContributions],
  )

  const pendingSubGivingsCount = useMemo(
    () => children.filter((c) => c.approvalStatus === 'PendingPastorApproval').length,
    [children],
  )

  const awaitingMyApprovalCount =
    contributionSummary?.awaitingMyApprovalCount ?? myPendingContributions.length
  const approvedCount =
    contributionSummary?.approvedCount ??
    contributions.filter((c) => c.status === 'Approved').length

  const pendingTabCount =
    awaitingMyApprovalCount + (churchManager ? pendingSubGivingsCount : 0)

  const tabs = useMemo(() => {
    const items: { id: DetailTab; label: string; badge?: number }[] = [{ id: 'dashboard', label: 'Dashboard' }]
    if (program.hasChildren || !program.parentProgramId) {
      const badge = churchManager
        ? pendingSubGivingsCount || children.length || undefined
        : children.length || undefined
      items.push({ id: 'subgivings', label: 'Sub givings', badge })
    }
    if (pendingTabCount > 0) {
      items.push({ id: 'pending', label: 'Pending', badge: pendingTabCount })
    }
    if (churchManager && approvedCount > 0) {
      items.push({ id: 'approved', label: 'Approved', badge: approvedCount })
    }
    if (canLogContributions) {
      items.push({ id: 'log', label: 'Log giving' })
    }
    items.push({ id: 'contributions', label: 'Contributions', badge: contributions.length })
    if (contributions.length > 0) {
      items.push({ id: 'history', label: 'History', badge: new Set(contributions.map((c) => c.memberId)).size })
    }
    return items
  }, [
    churchManager,
    isFellowshipLeader,
    isCellLeader,
    isPfccManager,
    awaitingMyApprovalCount,
    pendingTabCount,
    approvedCount,
    canLogContributions,
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

  useEffect(() => {
    if (tab === 'subgivings' && onRefreshChildren) {
      void onRefreshChildren()
    }
  }, [tab, program.id, onRefreshChildren])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove(contributionId: string, contributionProgramId: string) {
    setBusy(true)
    setError(null)
    try {
      await approveContribution(api, contributionProgramId, contributionId)
      await onRefresh()
      if (onRefreshChildren) await onRefreshChildren()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject(
    contributionId: string,
    contributionProgramId: string,
    reason: string | null,
  ) {
    setBusy(true)
    setError(null)
    try {
      await rejectContribution(api, contributionProgramId, contributionId, reason ?? undefined)
      await onRefresh()
      if (onRefreshChildren) await onRefreshChildren()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject')
    } finally {
      setBusy(false)
    }
  }

  async function handleApproveSubGiving(subProgramId: string) {
    setBusy(true)
    setError(null)
    try {
      await approveSubGiving(api, subProgramId)
      await onRefresh()
      if (onRefreshChildren) await onRefreshChildren()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve sub-giving')
    } finally {
      setBusy(false)
    }
  }

  async function handleRejectSubGiving(subProgramId: string, reason: string | null) {
    setBusy(true)
    setError(null)
    try {
      await rejectSubGiving(api, subProgramId, reason ?? undefined)
      await onRefresh()
      if (onRefreshChildren) await onRefreshChildren()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject sub-giving')
    } finally {
      setBusy(false)
    }
  }

  const isLogTabActive = tab === 'log' && canLogContributions

  return (
    <div
      className={cn(
        isLogTabActive
          ? 'flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col gap-3 overflow-hidden'
          : 'space-y-6',
      )}
    >
      <DashboardPageHeader
        className={isLogTabActive ? 'shrink-0 space-y-2' : undefined}
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Givings', to: '/givings' },
          { label: program.title },
        ]}
        title={program.title}
        description={
          isLogTabActive
            ? undefined
            : `${givingTypeLabel(program.givingType)} · ${program.periodLabel}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ScopeKindBadge scopeKind={program.scopeKind} />
            <ProgramStatusBadge status={program.status} />
          </div>
        }
      />

      {error && <p className="shrink-0 text-sm text-destructive">{error}</p>}

      <nav className="flex shrink-0 flex-wrap gap-2">
        {tabs.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/20 hover:text-foreground',
              )}
            >
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
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
          pending={myPendingContributions}
          allPending={pendingContributions}
          acceptsContributions={acceptsContributions}
          isPastor={churchManager}
          isFellowshipLeader={isFellowshipLeader}
          isPfccManager={isPfccManager}
          isCellLeader={isCellLeader}
          viewerRole={me.role}
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
            canCreateSubGivingRole && !program.parentProgramId
              ? () => setSubGivingOpen(true)
              : undefined
          }
        />
      )}

      {tab === 'pending' && (
        <ContributionsApprovalTable
          api={api}
          tree={tree}
          parentProgram={program}
          childPrograms={children}
          mode="pending"
          viewerRole={me.role}
          canAct
          canApproveSubGivings={churchManager}
          busy={busy}
          onApprove={handleApprove}
          onReject={handleReject}
          onApproveSubGiving={handleApproveSubGiving}
          onRejectSubGiving={handleRejectSubGiving}
          onSummaryChange={() => void onRefresh()}
        />
      )}

      {tab === 'approved' && churchManager && (
        <ContributionsApprovalTable
          api={api}
          tree={tree}
          parentProgram={program}
          childPrograms={children}
          mode="approved"
          viewerRole={me.role}
          busy={busy}
          onApprove={async () => {}}
          onReject={async () => {}}
          onSummaryChange={() => void onRefresh()}
        />
      )}

      {tab === 'log' && canLogContributions && (
        <div className="flex min-h-0 flex-1 flex-col">
          <LogContributionWizard
            api={api}
            programId={program.id}
            meRole={me.role}
            tree={tree}
            scopeNodeId={me.scopeNodeId}
            disabled={busy}
            className="min-h-0 flex-1"
            onLogged={async () => {
              await onRefresh()
              if (onRefreshChildren) await onRefreshChildren()
            }}
          />
        </div>
      )}

      {tab === 'contributions' && (
        <ContributionsStructureTable
          programId={program.id}
          contributions={contributions}
          tree={tree}
          structureOptions={structureOptions}
          viewerRole={me.role}
        />
      )}

      {tab === 'history' && (
        <ContributionsHistoryTable contributions={contributions} tree={tree} viewerRole={me.role} />
      )}

      {canCreateSubGivingRole && subGivingOpen ? (
        <CreateSubPeriodWizard
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setSubGivingOpen(false)
          }}
          parent={program}
          api={api}
          tree={tree}
          requiresPastorApproval={!churchManager}
          scopeRootNodeId={isPfccManager ? me.scopeNodeId : null}
          onCreated={() => void onRefresh()}
        />
      ) : null}
    </div>
  )
}
