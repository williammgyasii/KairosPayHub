import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/api/useApi'
import type { StructureTree } from '@/api/structure'
import { formatApiError } from '@/lib/structure-tree'
import { hasTemplate, isStructureSetupComplete, structureProgress } from '@/lib/structure-dashboard'

export { hasTemplate, isStructureSetupComplete, structureProgress }

export function useStructureTree() {
  const api = useApi()
  const [tree, setTree] = useState<StructureTree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      setTree(await api.get<StructureTree>('/api/structure'))
    } catch (err) {
      setError(formatApiError(err))
      setTree(null)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function submit(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return { tree, error, busy, loading, load, submit }
}
