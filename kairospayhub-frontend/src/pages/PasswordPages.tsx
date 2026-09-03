import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { forgotPassword, resetPassword, setPassword } from '@/auth/client'
import { AuthAlert } from '@/components/layout/auth-alert'
import { AuthFooterLink, AuthFormCard, AuthLayout } from '@/components/layout/AuthLayout'
import { authFadeUp, authStagger } from '@/components/layout/auth-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPasswordValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('Invalid invite link')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await setPassword(token, password)
      navigate('/login', { state: { message: 'Password set. Sign in to continue.' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      variant="centered"
      title="Set your password"
      subtitle="You've been invited to KairosPayHub. Choose a password to finish setting up your account."
      footer={
        <>
          Already set up? <AuthFooterLink to="/login">Sign in</AuthFooterLink>
        </>
      }
    >
      <motion.form
        variants={authStagger}
        initial="hidden"
        animate="show"
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {!token && (
          <motion.div variants={authFadeUp}>
            <AuthAlert variant="error">
              This invite link is invalid. Ask your pastor to send a new invite.
            </AuthAlert>
          </motion.div>
        )}
        {error && (
          <motion.div variants={authFadeUp}>
            <AuthAlert variant="error">{error}</AuthAlert>
          </motion.div>
        )}

        <motion.div variants={authFadeUp} className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            required
            disabled={!token}
          />
          <p className="text-xs text-muted-foreground">
            8+ characters with upper, lower, and a number
          </p>
        </motion.div>

        <motion.div variants={authFadeUp}>
          <Button
            className="w-full"
            size="lg"
            type="submit"
            loading={busy}
            loadingLabel="Saving…"
            disabled={!token}
          >
            Set password
          </Button>
        </motion.div>
      </motion.form>
    </AuthLayout>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devResetLink, setDevResetLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setDevResetLink(null)
    try {
      const data = await forgotPassword(email)
      setDevResetLink(data.devResetLink ?? null)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={`If ${email} is registered, we sent a password reset link.`}
        footer={
          <>
            <AuthFooterLink to="/login">Back to sign in</AuthFooterLink>
          </>
        }
      >
        <AuthFormCard>
          <p className="text-sm text-muted-foreground">
            The link expires in one hour. Check spam if you don&apos;t see it.
          </p>
          {devResetLink && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Local dev — no email server? Use this link:
              </p>
              <Link
                to={(() => {
                  try {
                    const url = new URL(devResetLink)
                    return `${url.pathname}${url.search}`
                  } catch {
                    return devResetLink
                  }
                })()}
                className="mt-2 block break-all text-sm font-medium text-primary hover:underline"
              >
                Reset password
              </Link>
            </div>
          )}
        </AuthFormCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={
        <>
          Remember it? <AuthFooterLink to="/login">Sign in</AuthFooterLink>
        </>
      }
    >
      <AuthFormCard>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@church.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button className="h-10 w-full" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </AuthFormCard>
    </AuthLayout>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('Invalid reset link')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/login', {
        state: { message: 'Password updated. Sign in with your new password.' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick a strong password for your account."
      footer={
        <>
          <AuthFooterLink to="/login">Back to sign in</AuthFooterLink>
        </>
      }
    >
      <AuthFormCard>
        {!token && (
          <p className="mb-4 text-sm text-destructive">
            This reset link is invalid or expired. Request a new one from forgot password.
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button className="h-10 w-full" type="submit" disabled={busy || !token}>
            {busy ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      </AuthFormCard>
    </AuthLayout>
  )
}
