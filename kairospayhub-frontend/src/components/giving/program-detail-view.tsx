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
import { canCreateSubGiving, canManageChurch, canViewMemberGivings } from '@/api/auth'
import { useAppAbility } from '@/auth/ability-context'
import { structureOptionsForLeader } from '@/lib/contribution-structure'
import { ContributionsHistoryTable } from '@/components/giving/contributions-history-table'
import { ContributionsStructureTable } from '@/components/giving/contributions-structure-table'
import { ContributionsApprovalTable } from '@/components/giving/contributions-approval-table'
import { CreateSubPeriodWizard } from '@/components/giving/create-sub-period-wizard'
import { LogContributionWizard } from '@/components/giving/log-contribution-wizard'
import { ProgramDashboard, normalizeProgramDetailTab, type ProgramDetailTab } from '@/components/giving/program-dashboard'
import { ProgramDetailTabs } from '@/components/giving/program-detail-tabs'
import { ProgramStatusBadge, ScopeKindBadge } from '@/components/giving/giving-badges'
import { MemberGivingRankingsTable } from '@/components/giving/member-giving-rankings-table'
import { SubGivingsPanel } from '@/components/giving/sub-givings-panel'
import { GivingTransactionsLedger } from '@/components/giving/giving-transactions-ledger'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const ability = useAppAbility()
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
  const [txStatus, setTxStatus] = useState<'pending' | 'approved' | 'all'>('all')
  const showSubGivings = program.hasChildren || !program.parentProgramId
  const structureOptions = useMemo(
    () => structureOptionsForLeader(me.role, me.scopeNodeId),
    [me.role, me.scopeNodeId],
  )

  const campaignTreePrograms = useMemo(() => [program, ...children], [program, children])

  const pendingContributions = useMemo(
    () => contributions.filter((c) => c.status === 'PendingApproval'),
    [contributions],
  )

  const approvedContributions = useMemo(
    () => contributions.filter((c) => c.status === 'Approved'),
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
    contributionSummary?.approvedCount ?? approvedContributions.length
  const awaitingCount = pendingContributions.length
  const canSeeMemberGivings =
    ability.can('view', 'MemberGivings') || canViewMemberGivings(me)
  const canSeeTransactions =
    awaitingCount > 0 || awaitingMyApprovalCount > 0 || approvedCount > 0 || churchManager

  const tabs = useMemo(() => {
    const items: { id: DetailTab; label: string; badge?: number }[] = [
      { id: 'dashboard', label: 'Dashboard' },
    ]
    if (showSubGivings) {
      const badge = churchManager
        ? pendingSubGivingsCount || children.length || undefined
        : children.length || undefined
      items.push({ id: 'subgivings', label: 'Sub-campaigns', badge })
    }
    if (canSeeMemberGivings) {
      items.push({
        id: 'member-givings',
        label: 'Member givings',
        badge: approvedCount || undefined,
      })
    }
    if (canSeeTransactions) {
      items.push({
        id: 'transactions',
        label: 'Transactions',
        badge: awaitingCount || awaitingMyApprovalCount || undefined,
      })
    }
    if (!canSeeMemberGivings) {
      items.push({
        id: 'contributions',
        label: 'Contributions',
        badge: approvedCount || undefined,
      })
      if (approvedCount > 0) {
        items.push({
          id: 'history',
          label: 'History',
          badge: new Set(approvedContributions.map((c) => c.memberId)).size,
        })
      }
    }
    return items
  }, [
    churchManager,
    showSubGivings,
    pendingSubGivingsCount,
    children.length,
    awaitingCount,
    awaitingMyApprovalCount,
    approvedCount,
    approvedContributions,
    canSeeMemberGivings,
    canSeeTransactions,
  ])

  const [tab, setTab] = useState<DetailTab>(() => {
    return normalizeProgramDetailTab(initialTab) ?? 'dashboard'
  })

  // ProgramDetailPage keeps this component mounted when only :programId changes,
  // so reset tab when switching campaigns (e.g. parent sub-givings → leaf sub-giving).
  useEffect(() => {
    setTab((current) => {
      const preferred = normalizeProgramDetailTab(initialTab)
      if (preferred && tabs.some((item) => item.id === preferred)) return preferred
      const normalizedCurrent = normalizeProgramDetailTab(current) ?? current
      if (tabs.some((item) => item.id === normalizedCurrent)) return normalizedCurrent
      return 'dashboard'
    })
  }, [program.id, initialTab, tabs])

  useEffect(() => {
    setTxStatus(awaitingCount > 0 || awaitingMyApprovalCount > 0 ? 'pending' : 'all')
  }, [program.id]) // eslint-disable-line react-hooks/exhaustive-deps -- only reset when switching campaigns

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

      <div className={tab === 'dashboard' ? undefined : 'hidden'}>
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
          viewerRole={me.role}
          structureOptions={structureOptions}
          onTabChange={setTab}
          busy={busy}
          onApproveContribution={handleApprove}
          onRejectContribution={(contributionId, programId) => {
            void handleReject(contributionId, programId, null)
          }}
        />
      </div>

      {showSubGivings && (
        <div className={tab === 'subgivings' ? undefined : 'hidden'}>
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
        </div>
      )}

      {canSeeMemberGivings && (
        <div className={tab === 'member-givings' ? undefined : 'hidden'}>
          <MemberGivingRankingsTable
            api={api}
            campaigns={campaignTreePrograms}
            tree={tree}
            viewerRole={me.role}
            programId={program.id}
            scopeMode="campaign"
          />
        </div>
      )}

      {canSeeTransactions && (
        <div className={tab === 'transactions' || tab === 'awaiting' || tab === 'pending' ? undefined : 'hidden'}>
          <div className="mb-4 border-b border-border/60">
            <div className="-mb-px flex flex-wrap gap-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTxStatus(item.id)}
                  className={cn(
                    'border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                    txStatus === item.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={txStatus === 'all' ? undefined : 'hidden'}>
            <GivingTransactionsLedger
              api={api}
              campaigns={campaignTreePrograms}
              tree={tree}
              viewerRole={me.role}
              lockedProgramId={program.id}
            />
          </div>

          <div className={txStatus === 'pending' ? undefined : 'hidden'}>
            <ContributionsApprovalTable
              api={api}
              tree={tree}
              parentProgram={program}
              childPrograms={children}
              mode="pending"
              viewerRole={me.role}
              canAct={awaitingMyApprovalCount > 0 || churchManager}
              canApproveSubGivings={churchManager}
              busy={busy}
              onApprove={handleApprove}
              onReject={handleReject}
              onApproveSubGiving={handleApproveSubGiving}
              onRejectSubGiving={handleRejectSubGiving}
              onSummaryChange={() => void onRefresh()}
            />
          </div>

          <div className={txStatus === 'approved' ? undefined : 'hidden'}>
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
          </div>
        </div>
      )}

      {!canSeeMemberGivings && (
        <>
          <div className={tab === 'contributions' ? undefined : 'hidden'}>
            <ContributionsStructureTable
              programId={program.id}
              contributions={approvedContributions}
              tree={tree}
              structureOptions={structureOptions}
              viewerRole={me.role}
            />
          </div>

          <div className={tab === 'history' ? undefined : 'hidden'}>
            <ContributionsHistoryTable
              contributions={approvedContributions}
              tree={tree}
              viewerRole={me.role}
            />
          </div>
        </>
      )}

      {logOpen && canLogContributions ? (
        <Modal
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !busy) setLogOpen(false)
          }}
          title="Log giving"
          size="lg"
          className="max-h-[min(88vh,680px)]"
          contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
        >
          <LogContributionWizard
            embedded
            api={api}
            programId={program.id}
            meRole={me.role}
            tree={tree}
            scopeNodeId={me.scopeNodeId}
            disabled={busy}
            className="h-full min-h-0"
            onCancel={() => setLogOpen(false)}
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
