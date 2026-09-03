import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { AuthAlert } from '@/components/layout/auth-alert'
import { AuthFooterLink, AuthLayout } from '@/components/layout/AuthLayout'
import { authFadeUp, authStagger } from '@/components/layout/auth-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = (location.state as { message?: string } | null)?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { emailConfirmed } = await signIn(email, password)
      navigate(emailConfirmed ? '/' : '/confirm-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      variant="centered"
      title="Welcome back"
      subtitle="Sign in to your church dashboard."
      footer={
        <>
          New here? <AuthFooterLink to="/signup">Create an account</AuthFooterLink>
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
        {successMessage && (
          <motion.div variants={authFadeUp}>
            <AuthAlert variant="success">{successMessage}</AuthAlert>
          </motion.div>
        )}
        {error && (
          <motion.div variants={authFadeUp}>
            <AuthAlert variant="error">{error}</AuthAlert>
          </motion.div>
        )}

        <motion.div variants={authFadeUp} className="space-y-2">
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
        </motion.div>

        <motion.div variants={authFadeUp} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <Button variant="link" size="sm" className="h-auto px-0 text-xs" asChild>
              <Link to="/forgot-password">Forgot password?</Link>
            </Button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </motion.div>

        <motion.div variants={authFadeUp}>
          <Button className="w-full" size="lg" type="submit" loading={busy} loadingLabel="Signing in…">
            Sign in
          </Button>
        </motion.div>
      </motion.form>
    </AuthLayout>
  )
}
