import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { useApi } from '@/api/useApi'
import { useStructureTree } from '@/components/structure/structure-setup'
import {
  getProgram,
  listProgramContributions,
  type Contribution,
  type GivingProgram,
} from '@/api/giving'
import { ProgramStructureContributionsView } from '@/components/giving/contributions-structure-table'
import { structureOptionsForLeader } from '@/lib/contribution-structure'
import { Spinner } from '@/components/ui/spinner'

export function ProgramStructureContributionsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { programId = '', nodeId = '' } = useParams<{ programId: string; nodeId: string }>()
  const [searchParams] = useSearchParams()
  const groupBy = searchParams.get('group')
  const api = useApi()
  const { tree } = useStructureTree()
  const structureOptions = useMemo(
    () => (me.onboarded ? structureOptionsForLeader(me.role, me.scopeNodeId) : undefined),
    [me],
  )

  const [program, setProgram] = useState<GivingProgram | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!programId) return
    setLoading(true)
    setError(null)
    try {
      const prog = await getProgram(api, programId)
      setProgram(prog)
      setContributions(
        (await listProgramContributions(api, programId, { page: 1, pageSize: 500 })).contributions,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load giving structure')
      setProgram(null)
    } finally {
      setLoading(false)
    }
  }, [api, programId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !program) return <Spinner label="Loading structure breakdown…" />

  if (!program) {
    return <p className="text-sm text-destructive">{error ?? 'Giving not found.'}</p>
  }

  return (
    <ProgramStructureContributionsView
      program={program}
      nodeId={decodeURIComponent(nodeId)}
      groupBy={groupBy}
      contributions={contributions}
      tree={tree}
      structureOptions={structureOptions}
      viewerRole={me.onboarded ? me.role : undefined}
    />
  )
}
