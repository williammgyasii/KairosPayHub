import type { ReactNode } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { canApproveAttendance, canManageChurch, isScopedLeader } from '@/api/me'

export function AttendanceApproverRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (canApproveAttendance(me.role)) {
    return <>{children}</>
  }
  return <Navigate to="/attendance/submissions" replace />
}

export function AttendanceOverviewRoute({ children }: { children: ReactNode }) {
  const { me } = useOutletContext<DashboardOutletContext>()
  if (canManageChurch(me.role) || isScopedLeader(me.role)) {
    return <>{children}</>
  }
  return <Navigate to="/attendance/submissions" replace />
}
