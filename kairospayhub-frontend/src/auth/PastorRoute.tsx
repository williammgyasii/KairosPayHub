import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { isPastor } from '@/api/me'

export function PastorRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (!isPastor(me.role)) return <Navigate to="/" replace />
  return <>{children}</>
}
