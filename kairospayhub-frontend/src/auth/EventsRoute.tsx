import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { canAccessEvents } from '@/lib/calendar-events-ui'

export function EventsRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (me.onboarded && canAccessEvents(me)) {
    return <>{children}</>
  }
  return <Navigate to="/" replace />
}
