import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { useApi } from '@/shared/api'
import {
  approveContribution,
  approveSubGiving,
  rejectContribution,
  rejectSubGiving,
} from '@/features/giving/api'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { canApproveGiving, canManageChurch, canViewOverallGivings } from '@/api/auth'
import { ContributionsApprovalTable } from '@/features/giving/components/contributions-approval-table'
import { GivingTransactionsLedger } from '@/features/giving/components/giving-transactions-ledger'
import { cn } from '@/shared/lib/utils'
import { Spinner } from '@/shared/ui/spinner'
import { formatRtkQueryError } from '@/store/baseQuery'
import { useListGivingProgramsQuery } from '@/features/giving/api/givingApi'

type TransactionsTab = 'pending' | 'approved' | 'all'

export function TransactionsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const { tree } = useStructureTree()
  const [searchParams, setSearchParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const churchManager = canManageChurch(me.role)
  const canAct = canApproveGiving(me)
  const showApprovedTab = canViewOverallGivings(me) || canApproveGiving(me)

  const {
    data: programs = [],
    error: programsError,
    isLoading: programsLoading,
    refetch: refetchPrograms,
  } = useListGivingProgramsQuery()

  const tabParam = searchParams.get('tab') ?? searchParams.get('status')
  const tab: TransactionsTab =
    tabParam === 'pending'
      ? 'pending'
      : tabParam === 'approved' && showApprovedTab
        ? 'approved'
        : 'all'

  const pendingSubGivings = useMemo(
    () =>
      programs.filter(
        (row) => row.parentProgramId && row.approvalStatus === 'PendingPastorApproval',
      ),
    [programs],
  )

  const error = programsError ? formatRtkQueryError(programsError) : null
  const showInitialSpinner = programsLoading && programs.length === 0

  function setTab(nextTab: TransactionsTab) {
    setSearchParams(nextTab === 'all' ? {} : { tab: nextTab }, { replace: true })
  }

  async function handleApprove(contributionId: string, contributionProgramId: string) {
    setBusy(true)
    setActionError(null)
    try {
      await approveContribution(api, contributionProgramId, contributionId)
      await refetchPrograms()
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
      await refetchPrograms()
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
      await refetchPrograms()
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
      await refetchPrograms()
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
          { label: 'Dashboard', to: '/' },
          { label: 'Givings', to: '/givings' },
          { label: 'Transactions' },
        ]}
        title="Transactions"
        description={
          tab === 'all'
            ? 'Church-wide payment ledger — every logged contribution across campaigns you can access.'
            : canAct
              ? 'All church transactions: review pending submissions and browse approved records across campaigns.'
              : 'Track giving submissions logged in your scope across campaigns.'
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="border-b border-border/60">
        <div className="-mb-px flex flex-wrap gap-1">
          <TransactionsTabButton active={tab === 'all'} onClick={() => setTab('all')} label="All" />
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
        </div>
      </div>

      {showInitialSpinner ? (
        <Spinner label="Loading transactions…" />
      ) : (
        <>
          <div className={tab === 'all' ? undefined : 'hidden'}>
            <GivingTransactionsLedger
              api={api}
              campaigns={programs}
              tree={tree}
              viewerRole={me.role}
            />
          </div>
          <div className={tab === 'pending' ? undefined : 'hidden'}>
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
              onSummaryChange={() => void refetchPrograms()}
            />
          </div>
          {showApprovedTab && (
            <div className={tab === 'approved' ? undefined : 'hidden'}>
              <ContributionsApprovalTable
                api={api}
                scope="church"
                mode="approved"
                viewerRole={me.role}
                busy={busy}
                onApprove={async () => {}}
                onReject={async () => {}}
              />
            </div>
          )}
        </>
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
