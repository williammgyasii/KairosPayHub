import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AuthAlert({
  children,
  variant,
}: {
  children: ReactNode
  variant: 'success' | 'error'
}) {
  return (
    <p
      role="alert"
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        variant === 'success' && 'border-primary/25 bg-primary/5 text-primary',
        variant === 'error' && 'border-destructive/25 bg-destructive/5 text-destructive',
      )}
    >
      {children}
    </p>
  )
}
