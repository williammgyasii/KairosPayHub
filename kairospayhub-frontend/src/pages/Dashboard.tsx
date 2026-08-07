import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/api/useApi'
import { needsOnboarding, type Me } from '@/api/me'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export function DashboardRoot() {
  const api = useApi()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setMe(await api.get<Me>('/api/me'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your account')
    }
  }, [api])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (needsOnboarding(me)) {
    if (me.onboarded) return null
    return <OnboardingWizard me={me} onComplete={setMe} />
  }

  if (!me.onboarded) return null

  return <DashboardLayout me={me} reloadMe={load} />
}

// Backwards-compatible export for any imports
export const Dashboard = DashboardRoot
