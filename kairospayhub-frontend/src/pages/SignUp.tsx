import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { confirmEmail, register, resendConfirmation } from '@/auth/client'
import { EmailOtpForm } from '@/components/auth/email-otp-form'
import { AuthAlert } from '@/shared/layout/auth-alert'
import { AuthFooterLink, AuthLayout } from '@/shared/layout/AuthLayout'
import { authFadeUp, authStagger } from '@/shared/layout/auth-motion'
import { isTurnstileEnabled } from '@/shared/lib/turnstile-site-key'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { TurnstileField } from '@/shared/ui/turnstile-field'

function ConfirmEmailStep({
  email,
  password,
  onDone,
}: {
  email: string
  password: string
  onDone: () => void
}) {
  const { signIn } = useAuth()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const canSubmit = !isTurnstileEnabled() || turnstileToken !== null

  return (
    <AuthLayout
      variant="centered"
      title="Almost there"
      subtitle="Confirm your email to activate your account."
    >
      <EmailOtpForm
        email={email}
        confirmLabel="Confirm & continue"
        confirmDisabled={!canSubmit}
        extraFields={<TurnstileField action="login" onTokenChange={setTurnstileToken} />}
        onConfirm={async (code) => {
          await confirmEmail(email, code)
          await signIn(email, password, turnstileToken)
          onDone()
        }}
        onResend={() => resendConfirmation(email)}
      />
    </AuthLayout>
  )
}

export function SignUp() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const canSubmit = !isTurnstileEnabled() || turnstileToken !== null

  function fail(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register(name || email.split('@')[0], email, password, turnstileToken)
      setStep('confirm')
    } catch (err) {
      fail(err, 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'confirm') {
    return (
      <ConfirmEmailStep
        email={email}
        password={password}
        onDone={() => navigate('/')}
      />
    )
  }

  return (
    <AuthLayout
      variant="centered"
      title="Create your account"
      subtitle="Pastors sign up first, then set up their church."
      footer={
        <>
          Already have an account? <AuthFooterLink to="/login">Sign in</AuthFooterLink>
        </>
      }
    >
      <motion.form
        variants={authStagger}
        initial="hidden"
        animate="show"
        onSubmit={onCreate}
        className="space-y-5"
      >
        {error && (
          <motion.div variants={authFadeUp}>
            <AuthAlert variant="error">{error}</AuthAlert>
          </motion.div>
        )}

        <motion.div variants={authFadeUp} className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Pastor William Gyasi"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </motion.div>

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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            8+ characters with upper, lower, and a number
          </p>
        </motion.div>

        <motion.div variants={authFadeUp}>
          <TurnstileField action="register" onTokenChange={setTurnstileToken} />
        </motion.div>

        <motion.div variants={authFadeUp}>
          <Button
            className="w-full"
            size="lg"
            type="submit"
            loading={busy}
            loadingLabel="Creating…"
            disabled={!canSubmit}
          >
            Create account
          </Button>
        </motion.div>
      </motion.form>
    </AuthLayout>
  )
}
