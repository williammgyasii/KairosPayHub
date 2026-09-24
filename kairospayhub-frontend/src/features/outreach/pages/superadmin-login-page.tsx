import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { operatorToken, signInOperator } from '@/features/outreach/lib/operator-session'
import { AuthAlert } from '@/shared/layout/auth-alert'
import { AuthLayout } from '@/shared/layout/AuthLayout'
import { authFadeUp, authStagger } from '@/shared/layout/auth-motion'
import { isTurnstileEnabled } from '@/shared/lib/turnstile-site-key'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { TurnstileField } from '@/shared/ui/turnstile-field'
import { motion } from 'framer-motion'

export function SuperadminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const canSubmit = !isTurnstileEnabled() || turnstileToken !== null

  if (operatorToken()) return <Navigate to="/superadmin" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signInOperator(email, password, turnstileToken)
      navigate('/superadmin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      variant="centered"
      title="Operator sign-in"
      subtitle="Sign in to church outreach. This door does not open the church dashboard."
    >
      <motion.form
        variants={authStagger}
        initial="hidden"
        animate="show"
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {error && (
          <motion.div variants={authFadeUp}>
            <AuthAlert variant="error">{error}</AuthAlert>
          </motion.div>
        )}
        <motion.div variants={authFadeUp} className="space-y-2">
          <Label htmlFor="operator-email">Email</Label>
          <Input
            id="operator-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </motion.div>
        <motion.div variants={authFadeUp} className="space-y-2">
          <Label htmlFor="operator-password">Password</Label>
          <Input
            id="operator-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </motion.div>
        <motion.div variants={authFadeUp}>
          <TurnstileField action="login" onTokenChange={setTurnstileToken} />
        </motion.div>
        <motion.div variants={authFadeUp}>
          <Button className="w-full" size="lg" type="submit" loading={busy} disabled={!canSubmit}>
            Sign in
          </Button>
        </motion.div>
      </motion.form>
    </AuthLayout>
  )
}
