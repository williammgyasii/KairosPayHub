import { Loader2 } from 'lucide-react'
import type { ServiceRecordingUploadJob } from '@/features/media/lib/service-recording-upload-queue'
import { cn } from '@/shared/lib/utils'

function TileProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-white/25"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-white transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}

export function ServiceRecordingUploadOverlay({
  job,
  className,
}: {
  job: ServiceRecordingUploadJob
  className?: string
}) {
  const isUploading = job.status === 'uploading'
  const isQueued = job.status === 'queued'

  if (!isUploading && !isQueued) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/55 backdrop-blur-[1px]',
        className,
      )}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-2 text-white">
        {isUploading ? (
          <>
            <TileProgressRing percent={job.progress.percent} />
            <span className="text-sm font-semibold tabular-nums">{job.progress.percent}%</span>
            <span className="text-[11px] font-medium text-white/80">Uploading…</span>
          </>
        ) : (
          <>
            <Loader2 className="size-8 animate-spin" aria-hidden />
            <span className="text-[11px] font-medium text-white/80">Waiting to upload…</span>
          </>
        )}
      </div>
    </div>
  )
}
