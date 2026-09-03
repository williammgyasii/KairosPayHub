import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/core'
import { listPrograms, type GivingProgram, type MemberGivingTotalsSummary } from '@/api/giving'
import { useStructureTree } from '@/components/structure/structure-setup'
import { OverallGivingsMetrics } from '@/components/giving/overall-givings-metrics'
import { MemberGivingRankingsTable } from '@/components/giving/member-giving-rankings-table'
import { Spinner } from '@/components/ui/spinner'

export function OverallGivingsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const { tree } = useStructureTree()
  const [campaigns, setCampaigns] = useState<GivingProgram[]>([])
  const [summary, setSummary] = useState<MemberGivingTotalsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCampaigns(await listPrograms(api))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load campaigns')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Givings', to: '/givings' },
          { label: 'Overall givings' },
        ]}
        title="Overall givings"
        description="Approved member totals and rankings across campaigns. Pending payments appear under Transactions for approval."
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <Spinner label="Loading campaigns…" />
      ) : (
        <>
          {summary && <OverallGivingsMetrics summary={summary} />}

          <MemberGivingRankingsTable
            api={api}
            campaigns={campaigns}
            tree={tree}
            viewerRole={me.role}
            onSummaryChange={setSummary}
          />
        </>
      )}
    </div>
  )
}
