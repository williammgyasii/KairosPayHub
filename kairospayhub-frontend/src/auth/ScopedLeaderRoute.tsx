import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { isPastor, isScopedLeader } from '@/api/me'

export function ScopedLeaderRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (isPastor(me.role) || isScopedLeader(me.role)) return <>{children}</>
  return <Navigate to="/" replace />
}

export function PastorOrScopedLeaderRoute({ children }: { children: ReactNode }) {
  return <ScopedLeaderRoute>{children}</ScopedLeaderRoute>
}
