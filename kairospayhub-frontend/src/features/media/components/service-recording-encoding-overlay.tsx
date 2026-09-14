import { AlertCircle, Clapperboard, Loader2, Upload } from 'lucide-react'
import type { ServiceRecordingTileOverlay } from '@/features/media/lib/service-recording-tile-policy'
import { cn } from '@/shared/lib/utils'

const overlayCopy: Record<
  Exclude<ServiceRecordingTileOverlay, 'uploading' | null>,
  { label: string; hint: string }
> = {
  encoding: {
    label: 'Encoding…',
    hint: 'Check back soon',
  },
  'awaiting-upload': {
    label: 'Awaiting video',
    hint: 'Upload to continue',
  },
  failed: {
    label: 'Encoding failed',
    hint: 'Try uploading again',
  },
}

export function ServiceRecordingEncodingOverlay({
  variant,
  className,
}: {
  variant: Exclude<ServiceRecordingTileOverlay, 'uploading' | null>
  className?: string
}) {
  const copy = overlayCopy[variant]
  const Icon = variant === 'failed' ? AlertCircle : variant === 'awaiting-upload' ? Upload : Clapperboard

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/55 backdrop-blur-[1px]',
        className,
      )}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center text-white">
        {variant === 'encoding' ? (
          <Loader2 className="size-8 animate-spin" aria-hidden />
        ) : (
          <Icon className="size-8" aria-hidden />
        )}
        <span className="text-sm font-semibold">{copy.label}</span>
        <span className="text-[11px] font-medium text-white/80">{copy.hint}</span>
      </div>
    </div>
  )
}
