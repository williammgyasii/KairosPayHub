import { cn } from '@/lib/utils'

interface KairosLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-14',
} as const

export function KairosLogo({ className, size = 'md' }: KairosLogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      aria-hidden
      className={cn('rounded-xl shadow-sm', sizes[size], className)}
    />
  )
}

export function KairosWordmark({ className }: { className?: string }) {
  return (
    <p className={cn('text-sm font-semibold tracking-tight', className)}>KairosPayHub</p>
  )
}
