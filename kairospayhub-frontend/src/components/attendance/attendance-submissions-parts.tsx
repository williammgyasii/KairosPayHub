import { cn } from '@/lib/utils'

export function AttendanceStatusBanner({
  tone,
  message,
}: {
  tone: 'error' | 'success'
  message: string
}) {
  return (
    <p
      className={cn(
        'text-sm',
        tone === 'error' ? 'text-destructive' : 'text-emerald-700',
      )}
    >
      {message}
    </p>
  )
}

export function AttendanceEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1 py-8">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
