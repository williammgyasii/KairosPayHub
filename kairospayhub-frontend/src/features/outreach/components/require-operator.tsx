import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { operatorToken } from '@/features/outreach/lib/operator-session'

export function RequireOperator({ children }: { children: ReactNode }) {
  if (!operatorToken()) return <Navigate to="/superadmin/login" replace />
  return <>{children}</>
}
