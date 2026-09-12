import { useCallback, useEffect } from 'react'
import { useGetMeQuery } from '@/store/meApi'
import { churchCurrency, isNotOnboarded } from '@/api/auth'
import { setChurchDefaultCurrency } from '@/features/giving/api'
import { DashboardLayout } from '@/shared/layout/dashboard-layout'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Spinner } from '@/shared/ui/spinner'
import { formatRtkQueryError } from '@/store/baseQuery'
import { registerPushServiceWorker } from '@/features/notifications/lib/register-service-worker'

export function DashboardRoot() {
  const { data: me, error, isLoading, refetch } = useGetMeQuery()

  useEffect(() => {
    if (me) setChurchDefaultCurrency(churchCurrency(me))
  }, [me])

  useEffect(() => {
    if (me && !isNotOnboarded(me)) registerPushServiceWorker()
  }, [me])

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
