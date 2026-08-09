import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/useApi'
import {
  approveContribution,
  approveSubGiving,
  listPrograms,
  rejectContribution,
  rejectSubGiving,
  type GivingProgram,
} from '@/api/giving'
import { useStructureTree } from '@/components/structure/structure-setup'
import { canManageChurch, isScopedLeader } from '@/api/me'
import { ContributionsApprovalTable } from '@/components/giving/contributions-approval-table'
import { GivingTransactionsLedger } from '@/components/giving/giving-transactions-ledger'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

type TransactionsTab = 'pending' | 'approved' | 'all'

export function TransactionsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const { tree } = useStructureTree()
  const [searchParams, setSearchParams] = useSearchParams()
  const [programs, setPrograms] = useState<GivingProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const churchManager = canManageChurch(me.role)
  const canAct = churchManager || isScopedLeader(me.role)
  const showApprovedTab = churchManager || isScopedLeader(me.role)

  const tabParam = searchParams.get('tab')
  const tab: TransactionsTab =
    tabParam === 'all'
      ? 'all'
      : tabParam === 'approved' && showApprovedTab
        ? 'approved'
        : 'pending'

  const pendingSubGivings = useMemo(
    () =>
      programs.filter(
        (row) => row.parentProgramId && row.approvalStatus === 'PendingPastorApproval',
      ),
    [programs],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPrograms(await listPrograms(api))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load transactions')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  function setTab(nextTab: TransactionsTab) {
    setSearchParams(nextTab === 'pending' ? {} : { tab: nextTab }, { replace: true })
  }

  async function handleApprove(contributionId: string, contributionProgramId: string) {
    setBusy(true)
    setActionError(null)
    try {
      await approveContribution(api, contributionProgramId, contributionId)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not approve')
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
    setActionError(null)
    try {
      await rejectContribution(api, contributionProgramId, contributionId, reason ?? undefined)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not reject')
    } finally {
      setBusy(false)
    }
  }

  async function handleApproveSubGiving(programId: string) {
    setBusy(true)
    setActionError(null)
    try {
      await approveSubGiving(api, programId)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not approve sub-giving')
    } finally {
      setBusy(false)
    }
  }

  async function handleRejectSubGiving(programId: string, reason: string | null) {
    setBusy(true)
    setActionError(null)
    try {
      await rejectSubGiving(api, programId, reason ?? undefined)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not reject sub-giving')
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
          { label: 'Transactions' },
        ]}
        title="Transactions"
        description={
          tab === 'all'
            ? 'Full payment ledger across campaigns — every logged contribution with filters and detail.'
            : canAct
              ? 'Review pending giving submissions and approved records across all campaigns.'
              : 'Track giving submissions logged in your scope.'
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="border-b border-border/60">
        <div className="-mb-px flex flex-wrap gap-1">
          <TransactionsTabButton
            active={tab === 'pending'}
            onClick={() => setTab('pending')}
            label="Pending"
          />
          {showApprovedTab && (
            <TransactionsTabButton
              active={tab === 'approved'}
              onClick={() => setTab('approved')}
              label="Approved"
            />
          )}
          <TransactionsTabButton active={tab === 'all'} onClick={() => setTab('all')} label="All" />
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading transactions…" />
      ) : tab === 'all' ? (
        <GivingTransactionsLedger
          api={api}
          campaigns={programs}
          tree={tree}
          viewerRole={me.role}
        />
      ) : tab === 'pending' ? (
        <ContributionsApprovalTable
          api={api}
          scope="church"
          tree={tree}
          mode="pending"
          viewerRole={me.role}
          canAct={canAct}
          canApproveSubGivings={churchManager}
          pendingSubGivings={pendingSubGivings}
          busy={busy}
          onApprove={handleApprove}
          onReject={handleReject}
          onApproveSubGiving={handleApproveSubGiving}
          onRejectSubGiving={handleRejectSubGiving}
          onSummaryChange={() => void load()}
        />
      ) : (
        <ContributionsApprovalTable
          api={api}
          scope="church"
          mode="approved"
          viewerRole={me.role}
          busy={busy}
          onApprove={async () => {}}
          onReject={async () => {}}
        />
      )}
    </div>
  )
}

function TransactionsTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}
