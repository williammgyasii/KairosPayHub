import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { serviceRecordingsVisible } from '@/features/media/lib/service-recording-feature-policy'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'

export function MediaRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (!me.onboarded || !serviceRecordingsVisible(me)) {
    return <Navigate to="/" replace />
  }

  return children
}
