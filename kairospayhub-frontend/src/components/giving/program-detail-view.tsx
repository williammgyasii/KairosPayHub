import { useEffect, useMemo, useState } from 'react'
import { HandCoins, Plus } from 'lucide-react'
import type { Me } from '@/api/auth'
import type { ApiClient } from '@/api/core'
import type { Contribution, ContributionListSummary, GivingProgram, GivingProgramRollup } from '@/api/giving'
import {
  approveContribution,
  approveSubGiving,
  rejectContribution,
  rejectSubGiving,
} from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { givingTypeLabel, contributionsAwaitingMyApproval } from '@/lib/giving-ui'
import { canCreateSubGiving, canManageChurch } from '@/api/auth'
import { structureOptionsForLeader } from '@/lib/contribution-structure'
import { ContributionsHistoryTable } from '@/components/giving/contributions-history-table'
import { ContributionsStructureTable } from '@/components/giving/contributions-structure-table'
import { ContributionsApprovalTable } from '@/components/giving/contributions-approval-table'
import { CreateSubPeriodWizard } from '@/components/giving/create-sub-period-wizard'
import { LogContributionWizard } from '@/components/giving/log-contribution-wizard'
import { ProgramDashboard, type ProgramDetailTab } from '@/components/giving/program-dashboard'
import { ProgramDetailTabs } from '@/components/giving/program-detail-tabs'
import { ProgramStatusBadge, ScopeKindBadge } from '@/components/giving/giving-badges'
import { SubGivingsPanel } from '@/components/giving/sub-givings-panel'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

export type ProgramDetailModal = 'log'

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
  initialModal?: ProgramDetailModal
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
  initialModal,
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
  const [logOpen, setLogOpen] = useState(false)
  const showSubGivings = program.hasChildren || !program.parentProgramId
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
    if (showSubGivings) {
      const badge = churchManager
        ? pendingSubGivingsCount || children.length || undefined
        : children.length || undefined
      items.push({ id: 'subgivings', label: 'Sub-campaigns', badge })
    }
    if (pendingTabCount > 0) {
      items.push({ id: 'pending', label: 'Pending', badge: pendingTabCount })
    }
    if (churchManager && approvedCount > 0) {
      items.push({ id: 'approved', label: 'Approved', badge: approvedCount })
    }
    items.push({ id: 'contributions', label: 'Contributions', badge: contributions.length })
    if (contributions.length > 0) {
      items.push({ id: 'history', label: 'History', badge: new Set(contributions.map((c) => c.memberId)).size })
    }
    return items
  }, [
    churchManager,
    showSubGivings,
    pendingSubGivingsCount,
    children.length,
    pendingTabCount,
    approvedCount,
    contributions.length,
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
    if (initialModal === 'log' && canLogContributions) {
      setLogOpen(true)
    }
  }, [program.id, initialModal, canLogContributions])

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

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Givings', to: '/givings' },
          { label: program.title },
        ]}
        title={program.title}
        description={`${givingTypeLabel(program.givingType)} · ${program.periodLabel}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ScopeKindBadge scopeKind={program.scopeKind} />
            <ProgramStatusBadge status={program.status} />
            {canLogContributions && (
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setLogOpen(true)}>
                <HandCoins className="size-4" />
                Log giving
              </Button>
            )}
            {canCreateSubGivingRole && showSubGivings && !program.parentProgramId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setSubGivingOpen(true)}
              >
                <Plus className="size-4" />
                Add sub-campaign
              </Button>
            )}
          </div>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ProgramDetailTabs tabs={tabs} activeId={tab} onChange={setTab} />

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
          onLogGiving={canLogContributions ? () => setLogOpen(true) : undefined}
        />
      )}

      {tab === 'subgivings' && showSubGivings && (
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

      {logOpen && canLogContributions ? (
        <Modal
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !busy) setLogOpen(false)
          }}
          title="Log giving"
          description="Record a member payment with proof. Submissions stay pending until approved."
          size="xl"
          className="max-w-3xl"
        >
          <LogContributionWizard
            embedded
            api={api}
            programId={program.id}
            meRole={me.role}
            tree={tree}
            scopeNodeId={me.scopeNodeId}
            disabled={busy}
            className="min-h-[min(70vh,640px)]"
            onLogged={async () => {
              await onRefresh()
              if (onRefreshChildren) await onRefreshChildren()
            }}
          />
        </Modal>
      ) : null}

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
