import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { setPassword } from '../auth/client'

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
    <div className="center-screen">
      <form className="card" onSubmit={onSubmit}>
        <h1>Set your password</h1>
        <p className="sub">Create a password for your KairosPayHub account</p>
        {error && <p className="error">{error}</p>}
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            required
          />
        </div>
        <button className="primary" type="submit" disabled={busy || !token}>
          {busy ? 'Saving…' : 'Set password'}
        </button>
        <p className="switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { forgotPassword } = await import('../auth/client')
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="center-screen">
        <div className="card">
          <h1>Check your email</h1>
          <p className="sub">If {email} is registered, we sent a reset link.</p>
          <p className="switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="center-screen">
      <form className="card" onSubmit={onSubmit}>
        <h1>Reset password</h1>
        <p className="sub">We&apos;ll email you a reset link</p>
        {error && <p className="error">{error}</p>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPasswordValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('Invalid reset link')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { resetPassword } = await import('../auth/client')
      await resetPassword(token, password)
      navigate('/login', { state: { message: 'Password updated. Sign in with your new password.' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <form className="card" onSubmit={onSubmit}>
        <h1>Choose a new password</h1>
        {error && <p className="error">{error}</p>}
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            required
          />
        </div>
        <button className="primary" type="submit" disabled={busy || !token}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
