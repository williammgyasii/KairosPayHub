import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { canManageChurch, isPastor } from '@/api/auth'

export function ChurchManagerRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (!canManageChurch(me.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export function PastorOnlyRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (!isPastor(me.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

/** @deprecated Use ChurchManagerRoute */
export { ChurchManagerRoute as PastorRoute }
