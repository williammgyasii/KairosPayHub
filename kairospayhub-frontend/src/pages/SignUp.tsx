import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import { confirmEmail, register, resendConfirmation } from '@/auth/client'
import { EmailOtpForm } from '@/components/auth/email-otp-form'
import { AuthAlert } from '@/components/layout/auth-alert'
import { AuthFooterLink, AuthLayout } from '@/components/layout/AuthLayout'
import { authFadeUp, authStagger } from '@/components/layout/auth-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUp() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      await register(name || email.split('@')[0], email, password)
      setStep('confirm')
    } catch (err) {
      fail(err, 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'confirm') {
    return (
      <AuthLayout
        variant="centered"
        title="Almost there"
        subtitle="Confirm your email to activate your account."
      >
        <EmailOtpForm
          email={email}
          confirmLabel="Confirm & continue"
          onConfirm={async (code) => {
            await confirmEmail(email, code)
            await signIn(email, password)
            navigate('/')
          }}
          onResend={() => resendConfirmation(email)}
        />
      </AuthLayout>
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
          <Button className="w-full" size="lg" type="submit" loading={busy} loadingLabel="Creating…">
            Create account
          </Button>
        </motion.div>
      </motion.form>
    </AuthLayout>
  )
}
