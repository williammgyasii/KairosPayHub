import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { confirmEmail, resendConfirmation } from '@/auth/client'
import { EmailOtpForm } from '@/components/auth/email-otp-form'
import { AuthFormCard, AuthLayout } from '@/components/layout/AuthLayout'
import { Spinner } from '@/components/ui/spinner'

export function ConfirmEmail() {
  const { status, email, emailConfirmed, markEmailConfirmed } = useAuth()
  const navigate = useNavigate()

  if (status === 'loading') {
    return <Spinner label="Loading…" className="min-h-[40vh]" />
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace />
  }

  if (emailConfirmed) {
    return <Navigate to="/" replace />
  }

  if (!email) {
    return <Navigate to="/login" replace />
  }

  const address: string = email

  return (
    <AuthLayout
      title="Almost there"
      subtitle="Confirm your email to finish signing in and set up your church."
    >
      <AuthFormCard>
        <EmailOtpForm
          email={address}
          onConfirm={async (code) => {
            await confirmEmail(address, code)
            markEmailConfirmed()
            navigate('/')
          }}
          onResend={() => resendConfirmation(address)}
        />
      </AuthFormCard>
    </AuthLayout>
  )
}
