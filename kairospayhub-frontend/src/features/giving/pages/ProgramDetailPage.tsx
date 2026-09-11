import { useCallback, useMemo } from 'react'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { useApi } from '@/shared/api'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { ProgramDetailView, type ProgramDetailModal } from '@/features/giving/components/program-detail-view'
import { normalizeProgramDetailTab, type ProgramDetailTab } from '@/features/giving/components/program-dashboard'
import { canViewMemberGivings } from '@/api/auth'
import { Spinner } from '@/shared/ui/spinner'
import { formatRtkQueryError } from '@/store/baseQuery'
import {
  invalidateChildGivingPrograms,
  invalidateGivingProgramDetail,
  useGetGivingProgramQuery,
  useGetProgramRollupQuery,
  useListChildGivingProgramsQuery,
  useListProgramContributionsQuery,
} from '@/features/giving/api/givingApi'
import { useAppDispatch } from '@/store/hooks'

export function ProgramDetailPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { programId = '' } = useParams<{ programId: string }>()
  const [searchParams] = useSearchParams()
  const api = useApi()
  const dispatch = useAppDispatch()
  const { tree } = useStructureTree()

  const initialTab = useMemo((): ProgramDetailTab | undefined => {
    return normalizeProgramDetailTab(searchParams.get('tab'))
  }, [searchParams])

  const initialModal = useMemo((): ProgramDetailModal | undefined => {
    const tab = searchParams.get('tab')
    if (tab === 'log') return 'log'
    return undefined
  }, [searchParams])

  const canSeeRollup = canViewMemberGivings(me)

  const {
    data: program,
    error: programError,
    isLoading: programLoading,
  } = useGetGivingProgramQuery(programId, { skip: !programId })

  const { data: children = [] } = useListChildGivingProgramsQuery(programId, {
    skip: !programId || !program?.hasChildren,
  })

  const {
    data: contributionList,
    error: contributionsError,
  } = useListProgramContributionsQuery(
    { programId, query: { page: 1, pageSize: 100 } },
    { skip: !programId },
  )

  const { data: rollup = null } = useGetProgramRollupQuery(programId, {
    skip: !programId || !canSeeRollup,
  })

  const onRefresh = useCallback(async () => {
    if (!programId) return
    dispatch(invalidateGivingProgramDetail(programId))
  }, [dispatch, programId])

  const onRefreshChildren = useCallback(async () => {
    if (!programId) return
    dispatch(invalidateChildGivingPrograms(programId))
  }, [dispatch, programId])

  const error = programError
    ? formatRtkQueryError(programError)
    : contributionsError
      ? formatRtkQueryError(contributionsError)
      : null

  if (programLoading && !program) {
    return <Spinner label="Loading program…" />
  }

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
      contributions={contributionList?.contributions ?? []}
      contributionSummary={contributionList?.summary ?? null}
      rollup={rollup}
      onRefresh={onRefresh}
      onRefreshChildren={onRefreshChildren}
      initialTab={initialTab}
      initialModal={initialModal}
    />
  )
}
