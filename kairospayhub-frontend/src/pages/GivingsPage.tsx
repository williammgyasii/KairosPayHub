import { useCallback, useEffect, useState } from 'react'
import { Coins, Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/useApi'
import {
  getGivingDashboard,
  listPrograms,
  type GivingDashboardCampaign,
  type GivingProgram,
} from '@/api/giving'
import { useStructureTree } from '@/components/structure/structure-setup'
import { CreateProgramWizard } from '@/components/giving/create-program-wizard'
import { GivingDashboardPanel } from '@/components/giving/giving-dashboard'
import { GivingTable } from '@/components/giving/giving-table'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

function canCreateGiving(role: string) {
  return role === 'Pastor' || role === 'FellowshipLeader' || role === 'PFCCManager'
}

export function GivingsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const { tree } = useStructureTree()
  const [givings, setGivings] = useState<GivingProgram[]>([])
  const [dashboardCampaigns, setDashboardCampaigns] = useState<GivingDashboardCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const isPastor = me.role === 'Pastor'
  const canCreate = canCreateGiving(me.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [programs, dashboard] = await Promise.all([
        listPrograms(api),
        isPastor ? getGivingDashboard(api) : Promise.resolve(null),
      ])
      setGivings(programs)
      setDashboardCampaigns(dashboard?.campaigns ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load givings')
    } finally {
      setLoading(false)
    }
  }, [api, isPastor])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[{ label: 'Overview', to: '/' }, { label: 'Givings' }]}
        title="Givings"
        description="Track money collected through church campaigns — log contributions, approve, and roll up totals."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New giving
            </Button>
          ) : undefined
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <Spinner label="Loading givings…" />
      ) : (
        <>
          {isPastor && dashboardCampaigns.length > 0 && (
            <GivingDashboardPanel campaigns={dashboardCampaigns} />
          )}

          {givings.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader className="items-center text-center">
                <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Coins className="size-6" />
                </span>
                <CardTitle>No givings yet</CardTitle>
                <CardDescription className="max-w-md">
                  {canCreate
                    ? 'Start a Rhapsody or other giving campaign. Add sub-periods for monthly tracking; cell leaders log on sub-periods.'
                    : 'When your pastor or fellowship leader opens a giving campaign, it will appear here.'}
                </CardDescription>
                {canCreate && (
                  <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Create first giving
                  </Button>
                )}
              </CardHeader>
            </Card>
          ) : (
            <GivingTable rows={givings} />
          )}
        </>
      )}

      <CreateProgramWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        me={me}
        api={api}
        tree={tree}
        onCreated={() => void load()}
      />
    </div>
  )
}

/** @deprecated Use GivingsPage */
export const ProgramsPage = GivingsPage
