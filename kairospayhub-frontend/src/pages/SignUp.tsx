import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { confirmEmail, register, resendConfirmation } from '@/auth/client'
import { EmailOtpForm } from '@/components/auth/email-otp-form'
import { AuthFooterLink, AuthFormCard, AuthLayout } from '@/components/layout/AuthLayout'
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
        title="Almost there"
        subtitle="Confirm your email to activate your account."
      >
        <AuthFormCard>
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
        </AuthFormCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Pastors sign up first, then set up their church."
      footer={
        <>
          Already have an account? <AuthFooterLink to="/login">Sign in</AuthFooterLink>
        </>
      }
    >
      <AuthFormCard>
        <form onSubmit={onCreate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
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
            </div>

            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </Button>
        </form>
      </AuthFormCard>
    </AuthLayout>
  )
}
