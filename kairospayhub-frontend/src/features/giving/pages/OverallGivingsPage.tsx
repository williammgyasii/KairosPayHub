import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { useApi } from '@/shared/api'
import { listPrograms, type GivingProgram, type MemberGivingTotalsSummary } from '@/features/giving/api'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { OverallGivingsMetrics } from '@/features/giving/components/overall-givings-metrics'
import { MemberGivingRankingsTable } from '@/features/giving/components/member-giving-rankings-table'
import { Spinner } from '@/shared/ui/spinner'

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
        description="Approved member totals across campaigns. Use Columns to show per-campaign amounts. Pending payments appear under Transactions."
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
