import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { useApi } from '@/api/useApi'
import { useStructureTree } from '@/components/structure/structure-setup'
import {
  getProgram,
  getProgramRollup,
  listChildPrograms,
  listProgramContributions,
  type Contribution,
  type GivingProgram,
  type GivingProgramRollup,
} from '@/api/giving'
import { ProgramDetailView } from '@/components/giving/program-detail-view'
import type { ProgramDetailTab } from '@/components/giving/program-dashboard'
import { Spinner } from '@/components/ui/spinner'

export function ProgramDetailPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { programId = '' } = useParams<{ programId: string }>()
  const [searchParams] = useSearchParams()
  const api = useApi()
  const { tree } = useStructureTree()

  const initialTab = useMemo(() => {
    const tab = searchParams.get('tab')
    const allowed: ProgramDetailTab[] = [
      'dashboard',
      'subperiods',
      'pending',
      'log',
      'contributions',
      'history',
    ]
    return allowed.includes(tab as ProgramDetailTab) ? (tab as ProgramDetailTab) : undefined
  }, [searchParams])

  const [program, setProgram] = useState<GivingProgram | null>(null)
  const [children, setChildren] = useState<GivingProgram[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [rollup, setRollup] = useState<GivingProgramRollup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isPastor = me.role === 'Pastor'

  const load = useCallback(async () => {
    if (!programId) return
    setLoading(true)
    setError(null)
    try {
      const prog = await getProgram(api, programId)
      setProgram(prog)
      setChildren(prog.hasChildren ? await listChildPrograms(api, programId) : [])
      setContributions(await listProgramContributions(api, programId))
      if (isPastor) {
        setRollup(await getProgramRollup(api, programId))
      } else {
        setRollup(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load program')
      setProgram(null)
    } finally {
      setLoading(false)
    }
  }, [api, programId, isPastor])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !program) return <Spinner label="Loading program…" />

  if (!program) {
    return <p className="text-sm text-destructive">{error ?? 'Program not found.'}</p>
  }

  return (
    <ProgramDetailView
      me={me}
      api={api}
      tree={tree}
      program={program}
      children={children}
      contributions={contributions}
      rollup={rollup}
      onRefresh={load}
      initialTab={initialTab}
    />
  )
}
