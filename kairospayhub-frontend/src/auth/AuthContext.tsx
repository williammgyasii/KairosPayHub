import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { resetSessionCache } from '@/store/resetSessionCache'
import * as auth from './client'

type Status = 'loading' | 'authed' | 'anon'

interface AuthValue {
  status: Status
  email: string | null
  emailConfirmed: boolean
  signIn: (email: string, password: string) => Promise<{ emailConfirmed: boolean }>
  markEmailConfirmed: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [emailConfirmed, setEmailConfirmed] = useState(true)

  useEffect(() => {
    auth.getSession().then((session) => {
      if (session) {
        setEmail(session.email)
        setEmailConfirmed(session.emailConfirmed)
        setStatus('authed')
      } else {
        setStatus('anon')
      }
    })
  }, [])

  const signIn = useCallback(async (e: string, password: string) => {
    resetSessionCache()
    const session = await auth.signIn(e, password)
    setEmail(session.email ?? e)
    setEmailConfirmed(session.emailConfirmed)
    setStatus('authed')
    return { emailConfirmed: session.emailConfirmed }
  }, [])

  const markEmailConfirmed = useCallback(() => {
    setEmailConfirmed(true)
  }, [])

  const signOut = useCallback(() => {
    auth.signOut()
    resetSessionCache()
    setEmail(null)
    setEmailConfirmed(true)
    setStatus('anon')
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ status, email, emailConfirmed, signIn, markEmailConfirmed, signOut }),
    [status, email, emailConfirmed, signIn, markEmailConfirmed, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
