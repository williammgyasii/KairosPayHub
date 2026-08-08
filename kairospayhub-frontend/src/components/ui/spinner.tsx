import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({
  className,
  label,
  size = 'md',
}: {
  className?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const iconSize = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-8' : 'size-5'

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn(iconSize, 'animate-spin text-primary')} aria-hidden />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  )
}

export function InlineSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden />
}
