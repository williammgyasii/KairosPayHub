import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { canAccessEvents } from '@/features/events/lib/calendar-events-ui'

export function EventsRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (me.onboarded && canAccessEvents(me)) {
    return <>{children}</>
  }
  return <Navigate to="/" replace />
}
