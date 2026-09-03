import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { canManageChurch } from '@/api/auth'

export function ChurchManagerRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (!canManageChurch(me.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

/** @deprecated Use ChurchManagerRoute */
export { ChurchManagerRoute as PastorRoute }
