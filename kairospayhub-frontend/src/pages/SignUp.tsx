import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { confirmSignUp, resendConfirmationCode, signUp } from '../auth/cognito'

export function SignUp() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function fail(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signUp(email, password, name || undefined)
      setStep('confirm')
    } catch (err) {
      fail(err, 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await confirmSignUp(email, code)
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      fail(err, 'Confirmation failed')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'confirm') {
    return (
      <div className="center-screen">
        <form className="card" onSubmit={onConfirm}>
          <h1>Check your email</h1>
          <p className="sub">We sent a 6-digit code to {email}</p>

          {error && <p className="error">{error}</p>}

          <div className="field">
            <label htmlFor="code">Confirmation code</label>
            <input
              id="code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Confirming…' : 'Confirm & continue'}
          </button>

          <p className="switch">
            Didn’t get it?{' '}
            <button
              type="button"
              className="link"
              onClick={() => resendConfirmationCode(email).catch((err) => fail(err, 'Could not resend'))}
            >
              Resend code
            </button>
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="center-screen">
      <form className="card" onSubmit={onCreate}>
        <h1>Create your account</h1>
        <p className="sub">Start tracking your church records</p>

        {error && <p className="error">{error}</p>}

        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

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

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="muted" style={{ fontSize: '0.75rem' }}>
            8+ chars with upper, lower &amp; a number
          </span>
        </div>

        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>

        <p className="switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
