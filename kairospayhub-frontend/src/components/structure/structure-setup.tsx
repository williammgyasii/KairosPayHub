import { useCallback, useState } from 'react'
import type { StructureTree } from '@/api/structure'
import { formatApiError } from '@/lib/structure-tree'
import { hasTemplate, isStructureSetupComplete, structureProgress } from '@/lib/structure-dashboard'
import { useGetStructureTreeQuery } from '@/store/structureApi'
import { formatRtkQueryError } from '@/store/baseQuery'

export { hasTemplate, isStructureSetupComplete, structureProgress }

export function useStructureTree() {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const {
    data: tree = null,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useGetStructureTreeQuery({})

  const load = useCallback(
    async (_options?: { includeMembers?: boolean }) => {
      await refetch()
    },
    [refetch],
  )

  const error =
    actionError ??
    (queryError ? formatRtkQueryError(queryError) : null)

  async function submit(action: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      await refetch()
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return {
    tree: tree as StructureTree | null,
    error,
    busy,
    loading: isLoading || isFetching,
    load,
    submit,
  }
}
