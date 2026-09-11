import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export function SettingsSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn('grid gap-5 border-b border-border/50 pb-8 last:border-0 last:pb-0', className)}
    >
      <div className="max-w-2xl">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function SettingsFieldGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode
  columns?: 2 | 3
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-4 sm:gap-5',
        columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SettingsField({
  label,
  value,
  children,
  className,
}: {
  label: string
  value?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <dt className="text-eyebrow">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{children ?? value ?? '—'}</dd>
    </div>
  )
}

export function SettingsPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}
