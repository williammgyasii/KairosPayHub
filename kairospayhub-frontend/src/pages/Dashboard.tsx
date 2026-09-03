import { useCallback } from 'react'
import { useGetMeQuery } from '@/store/meApi'
import { isNotOnboarded } from '@/api/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Spinner } from '@/components/ui/spinner'
import { formatRtkQueryError } from '@/store/baseQuery'

export function DashboardRoot() {
  const { data: me, error, isLoading, refetch } = useGetMeQuery()

  const reloadMe = useCallback(async () => {
    await refetch()
  }, [refetch])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-destructive">{formatRtkQueryError(error)}</p>
      </div>
    )
  }

  if (isLoading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading your dashboard…" />
      </div>
    )
  }

  if (isNotOnboarded(me)) {
    return <OnboardingWizard me={me} onComplete={() => void refetch()} />
  }

  if (!me.onboarded) return null

  return <DashboardLayout me={me} reloadMe={reloadMe} />
}

// Backwards-compatible export for any imports
export const Dashboard = DashboardRoot
