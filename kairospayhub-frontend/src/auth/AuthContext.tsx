import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as cognito from './cognito'

type Status = 'loading' | 'authed' | 'anon'

interface AuthValue {
  status: Status
  email: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    cognito.getSession().then((session) => {
      if (session) {
        setEmail(session.email)
        setStatus('authed')
      } else {
        setStatus('anon')
      }
    })
  }, [])

  const signIn = useCallback(async (e: string, password: string) => {
    const session = await cognito.signIn(e, password)
    setEmail(session.email)
    setStatus('authed')
  }, [])

  const signOut = useCallback(() => {
    cognito.signOut()
    setEmail(null)
    setStatus('anon')
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ status, email, signIn, signOut }),
    [status, email, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
