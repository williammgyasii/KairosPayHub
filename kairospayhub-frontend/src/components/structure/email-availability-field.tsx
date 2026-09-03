import { useEffect, useState, type ReactNode } from 'react'
import { useApi } from '@/api/core'
import { checkEmailAvailability, type EmailCheckScope } from '@/api/structure/email'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useEmailAvailability(
  email: string,
  scope: EmailCheckScope,
  enabled = true,
  excludeMemberId?: string,
) {
  const api = useApi()
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setChecking(false)
      setAvailable(null)
      setMessage(null)
      return
    }

    const trimmed = email.trim()
    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
      setChecking(false)
      setAvailable(null)
      setMessage(null)
      return
    }

    let cancelled = false
    setChecking(true)

    const timer = window.setTimeout(() => {
      void checkEmailAvailability(api, trimmed, scope, excludeMemberId)
        .then((result) => {
          if (cancelled) return
          setChecking(false)
          setAvailable(result.available)
          setMessage(result.message)
        })
        .catch(() => {
          if (cancelled) return
          setChecking(false)
          setAvailable(null)
          setMessage(null)
        })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [api, email, scope, enabled, excludeMemberId])

  return { checking, available, message }
}

export function EmailAvailabilityField({
  id,
  email,
  onChange,
  scope,
  required,
  placeholder,
  label,
  labelExtra,
  className,
  excludeMemberId,
  enabled = true,
}: {
  id: string
  email: string
  onChange: (value: string) => void
  scope: EmailCheckScope
  required?: boolean
  placeholder?: string
  label: ReactNode
  labelExtra?: ReactNode
  className?: string
  excludeMemberId?: string
  enabled?: boolean
}) {
  const { checking, available, message } = useEmailAvailability(email, scope, enabled, excludeMemberId)
  const trimmed = email.trim()
  const showUnavailable = Boolean(trimmed && EMAIL_PATTERN.test(trimmed) && available === false)

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-xs font-medium">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
        {labelExtra}
      </div>
      <Input
        id={id}
        type="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={showUnavailable}
        className={cn(showUnavailable && 'border-destructive focus-visible:ring-destructive/30')}
      />
      {checking && trimmed && EMAIL_PATTERN.test(trimmed) && (
        <p className="text-[11px] text-muted-foreground">Checking email…</p>
      )}
      {showUnavailable && message && (
        <p className="text-[11px] text-destructive">{message}</p>
      )}
    </div>
  )
}

export function isEmailAvailabilityBlocking(
  email: string,
  availability: { checking: boolean; available: boolean | null },
): boolean {
  const trimmed = email.trim()
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return false
  return availability.checking || availability.available === false
}
