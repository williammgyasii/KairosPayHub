import { useMemo, useState } from 'react'
import { Coins, Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/core'
import type { GivingProgram } from '@/api/giving'
import { useStructureTree } from '@/components/structure/structure-setup'
import { CreateProgramWizard } from '@/components/giving/create-program-wizard'
import {
  GivingCampaignConfirmModal,
  type CampaignConfirmAction,
} from '@/components/giving/giving-campaign-confirm-modal'
import type { CampaignAction } from '@/components/giving/giving-campaign-actions-menu'
import {
  campaignStatsByProgramId,
  deriveGivingMetrics,
  GivingTopMetrics,
  givingsPageDescription,
} from '@/components/giving/giving-metrics'
import { GivingTable, type GivingTableRow } from '@/components/giving/giving-table'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { canCreateGivingProgram, canManageChurch, isScopedLeader } from '@/api/auth'
import { formatRtkQueryError } from '@/store/baseQuery'
import {
  invalidateGivingTags,
  useCloseGivingProgramMutation,
  useDeleteGivingProgramMutation,
  useGetGivingDashboardQuery,
  useListGivingProgramsQuery,
  useReopenGivingProgramMutation,
} from '@/store/givingApi'
import { useAppDispatch } from '@/store/hooks'
import { formatApiError } from '@/lib/structure-tree'

function canCreateGiving(role: string) {
  return canCreateGivingProgram(role)
}

export function GivingsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const dispatch = useAppDispatch()
  const { tree } = useStructureTree()
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<CampaignConfirmAction | null>(null)
  const [confirmProgram, setConfirmProgram] = useState<GivingProgram | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const showTotals = canManageChurch(me.role) || isScopedLeader(me.role)
  const canCreate = canCreateGiving(me.role)
  const canManageCampaigns = canManageChurch(me.role)

  const {
    data: givings = [],
    error: programsError,
    isLoading: programsLoading,
  } = useListGivingProgramsQuery()

  const {
    data: dashboard = null,
    error: dashboardError,
    isLoading: dashboardLoading,
  } = useGetGivingDashboardQuery(undefined, { skip: !showTotals })

  const [closeProgram, { isLoading: closing }] = useCloseGivingProgramMutation()
  const [reopenProgram, { isLoading: reopening }] = useReopenGivingProgramMutation()
  const [deleteProgram, { isLoading: deleting }] = useDeleteGivingProgramMutation()

  const loading = programsLoading || (showTotals && dashboardLoading)
  const error = programsError
    ? formatRtkQueryError(programsError)
    : dashboardError
      ? formatRtkQueryError(dashboardError)
      : null
  const actionBusy = closing || reopening || deleting

  const metrics = useMemo(() => deriveGivingMetrics(dashboard, givings), [dashboard, givings])

  const tableRows = useMemo((): GivingTableRow[] => {
    const statsMap = campaignStatsByProgramId(dashboard)
    return givings.map((giving) => ({
      ...giving,
      stats: statsMap.get(giving.id),
    }))
  }, [givings, dashboard])

  const pageDescription = givingsPageDescription(me.role, metrics.scopeUnitName)

  function handleCampaignAction(action: CampaignAction, program: GivingProgram) {
    if (action === 'view' || action === 'subgivings') return
    setActionError(null)
    setConfirmProgram(program)
    setConfirmAction(action)
  }

  async function handleConfirmAction() {
    if (!confirmProgram || !confirmAction) return
    setActionError(null)
    try {
      if (confirmAction === 'close') await closeProgram(confirmProgram.id).unwrap()
      if (confirmAction === 'reopen') await reopenProgram(confirmProgram.id).unwrap()
      if (confirmAction === 'delete') await deleteProgram(confirmProgram.id).unwrap()
      setConfirmAction(null)
      setConfirmProgram(null)
    } catch (err) {
      setActionError(formatApiError(err))
    }
  }

  function handleCreated() {
    dispatch(invalidateGivingTags())
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Givings' }, { label: 'Campaigns' }]}
        title="Campaigns"
        description={pageDescription}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New campaign
            </Button>
          ) : undefined
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {loading ? (
        <Spinner label="Loading campaigns…" />
      ) : (
        <>
          {(givings.length > 0 || dashboard) && showTotals && (
            <GivingTopMetrics metrics={metrics} />
          )}

          {givings.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader className="items-center text-center">
                <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Coins className="size-6" />
                </span>
                <CardTitle>No campaigns yet</CardTitle>
                <CardDescription className="max-w-md">
                  {canCreate
                    ? 'Create a campaign (e.g. Rhapsody or Sunday service), then add sub givings for your units to log into.'
                    : 'When your pastor opens a campaign, it will show up here.'}
                </CardDescription>
                {canCreate && (
                  <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Create first campaign
                  </Button>
                )}
              </CardHeader>
            </Card>
          ) : (
            <GivingTable
              rows={tableRows}
              showTotals={showTotals}
              canManage={canManageCampaigns}
              onCampaignAction={handleCampaignAction}
            />
          )}
        </>
      )}

      {createOpen ? (
        <CreateProgramWizard
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setCreateOpen(false)
          }}
          me={me}
          api={api}
          tree={tree}
          onCreated={handleCreated}
        />
      ) : null}

      <GivingCampaignConfirmModal
        open={confirmAction != null && confirmProgram != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !actionBusy) {
            setConfirmAction(null)
            setConfirmProgram(null)
          }
        }}
        action={confirmAction}
        program={confirmProgram}
        busy={actionBusy}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  )
}

/** @deprecated Use GivingsPage */
export const ProgramsPage = GivingsPage
