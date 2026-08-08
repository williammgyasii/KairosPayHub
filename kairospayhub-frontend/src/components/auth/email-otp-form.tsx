import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Mail, RefreshCw } from 'lucide-react'
import { OtpInput } from '@/components/auth/otp-input'
import { Button } from '@/components/ui/button'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${local.length > 2 ? '•••' : ''}@${domain}`
}

interface EmailOtpFormProps {
  email: string
  onConfirm: (code: string) => Promise<void>
  onResend: () => Promise<void>
  confirmLabel?: string
  devHint?: boolean
}

export function EmailOtpForm({
  email,
  onConfirm,
  onResend,
  confirmLabel = 'Verify & continue',
  devHint = import.meta.env.DEV,
}: EmailOtpFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resent, setResent] = useState(false)

  function fail(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback)
  }

  async function submitCode(nextCode: string) {
    if (nextCode.length !== 6 || busy) return

    setBusy(true)
    setError(null)
    try {
      await onConfirm(nextCode)
    } catch (err) {
      fail(err, 'That code did not work. Try again or request a new one.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6) {
      setError('Enter all 6 digits from your email')
      return
    }
    await submitCode(code)
  }

  async function onResendClick() {
    setResendBusy(true)
    setError(null)
    setResent(false)
    try {
      await onResend()
      setCode('')
      setResent(true)
    } catch (err) {
      fail(err, 'Could not send a new code')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 text-center"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mail className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            {maskEmail(email)}
          </p>
        </div>
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-center text-sm text-destructive"
        >
          {error}
        </motion.p>
      )}

      {resent && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-primary"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          New code sent — check your email
        </motion.div>
      )}

      <div className="space-y-3">
        <OtpInput value={code} onChange={setCode} disabled={busy} autoFocus />
        <p className="text-center text-xs text-muted-foreground">
          Enter the 6-digit code we emailed you
        </p>
      </div>

      {devHint && (
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground">
          Local dev: if email is not configured, the code appears in the API terminal.
        </p>
      )}

      <Button className="h-11 w-full" type="submit" disabled={busy || code.length !== 6}>
        {busy ? 'Verifying…' : confirmLabel}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="h-10 w-full gap-2 text-muted-foreground"
        disabled={resendBusy || busy}
        onClick={() => void onResendClick()}
      >
        <RefreshCw className={`size-4 ${resendBusy ? 'animate-spin' : ''}`} aria-hidden />
        {resendBusy ? 'Sending new code…' : 'Send a new code'}
      </Button>
    </form>
  )
}
