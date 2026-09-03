import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const maxWidthClass = {
  sm: 'max-w-[380px]',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
} as const

export function CenteredPageShell({
  children,
  className,
  maxWidth = 'sm',
  compact = false,
}: {
  children: ReactNode
  className?: string
  maxWidth?: keyof typeof maxWidthClass
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 sm:px-6',
        compact ? 'py-4 sm:py-6' : 'py-12 sm:py-16',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.45_0.18_264/0.1),transparent)]"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/4 size-96 rounded-full bg-primary/5 blur-3xl"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-1/4 size-96 rounded-full bg-primary/5 blur-3xl"
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className={cn('relative w-full', maxWidthClass[maxWidth], className)}>{children}</div>
    </div>
  )
}
