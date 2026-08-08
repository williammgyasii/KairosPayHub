import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return <Spinner label="Signing you in…" className="min-h-[40vh]" />
  if (status === 'anon') return <Navigate to="/login" replace />
  return <>{children}</>
}
