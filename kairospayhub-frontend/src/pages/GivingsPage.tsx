import { useCallback, useEffect, useMemo, useState } from 'react'
import { Coins, Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/useApi'
import {
  closeProgram,
  deleteProgram,
  getGivingDashboard,
  listPrograms,
  reopenProgram,
  type GivingDashboard,
  type GivingProgram,
} from '@/api/giving'
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
import { isPastor, isScopedLeader } from '@/api/me'
import { formatApiError } from '@/lib/structure-tree'

function canCreateGiving(role: string) {
  return role === 'Pastor' || role === 'FellowshipLeader' || role === 'PFCCManager'
}

export function GivingsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const { tree } = useStructureTree()
  const [givings, setGivings] = useState<GivingProgram[]>([])
  const [dashboard, setDashboard] = useState<GivingDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<CampaignConfirmAction | null>(null)
  const [confirmProgram, setConfirmProgram] = useState<GivingProgram | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const showTotals = isPastor(me.role) || isScopedLeader(me.role)
  const canCreate = canCreateGiving(me.role)
  const canManageCampaigns = isPastor(me.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [programs, dashboardData] = await Promise.all([
        listPrograms(api),
        showTotals ? getGivingDashboard(api) : Promise.resolve(null),
      ])
      setGivings(programs)
      setDashboard(dashboardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load givings')
    } finally {
      setLoading(false)
    }
  }, [api, showTotals])

  useEffect(() => {
    void load()
  }, [load])

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
    setActionBusy(true)
    setActionError(null)
    try {
      if (confirmAction === 'close') await closeProgram(api, confirmProgram.id)
      if (confirmAction === 'reopen') await reopenProgram(api, confirmProgram.id)
      if (confirmAction === 'delete') await deleteProgram(api, confirmProgram.id)
      setConfirmAction(null)
      setConfirmProgram(null)
      await load()
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[{ label: 'Overview', to: '/' }, { label: 'Givings' }]}
        title="Givings"
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
          onCreated={() => void load()}
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
