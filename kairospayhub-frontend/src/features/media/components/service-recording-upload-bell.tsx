import { forwardRef, useMemo, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { ServiceRecordingUploadJobList } from '@/features/media/components/service-recording-upload-job-list'
import { useServiceRecordingUploadQueue } from '@/features/media/lib/service-recording-upload-queue'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { cn } from '@/shared/lib/utils'

function UploadProgressRing({
  percent,
  size = 18,
  className,
}: {
  percent: number
  size?: number
  className?: string
}) {
  const stroke = 2
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('-rotate-90', className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted-foreground/25"
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
        className="text-primary transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}

const UploadBellButton = forwardRef<
  HTMLButtonElement,
  {
    activeJob: ReturnType<typeof useServiceRecordingUploadQueue>['jobs'][number] | null
    jobCount: number
  }
>(function UploadBellButton({ activeJob, jobCount }, ref) {
  const isUploading = activeJob?.status === 'uploading'
  const isQueued = activeJob?.status === 'queued'
  const percent = activeJob?.progress.percent ?? 0

  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        'h-9 max-w-[11rem] shrink-0 gap-2 px-2.5 text-muted-foreground hover:text-foreground sm:max-w-[14rem]',
        (isUploading || isQueued) && 'text-foreground',
      )}
      aria-label={
        isUploading
          ? `Uploading ${activeJob?.title ?? 'recording'}, ${percent}%`
          : jobCount > 0
            ? `Recording uploads, ${jobCount} item${jobCount === 1 ? '' : 's'}`
            : 'Recording uploads'
      }
    >
      {isUploading ? (
        <UploadProgressRing percent={percent} />
      ) : isQueued ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Upload className="size-[18px]" aria-hidden />
      )}
      {activeJob && (isUploading || isQueued) ? (
        <>
          <span className="hidden min-w-0 truncate text-xs font-medium sm:inline">
            {activeJob.title}
          </span>
          {isUploading ? (
            <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
          ) : null}
        </>
      ) : jobCount > 0 ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {jobCount > 99 ? '99+' : jobCount}
        </span>
      ) : null}
    </Button>
  )
})

export function ServiceRecordingUploadBell() {
  const { jobs, retryUpload, dismissJob, hasActiveUploads } = useServiceRecordingUploadQueue()
  const [open, setOpen] = useState(false)

  const activeJob = useMemo(
    () =>
      jobs.find((job) => job.status === 'uploading') ??
      jobs.find((job) => job.status === 'queued') ??
      null,
    [jobs],
  )

  if (jobs.length === 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <UploadBellButton activeJob={activeJob} jobCount={jobs.length} />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <ServiceRecordingUploadJobList
          jobs={jobs}
          hasActiveUploads={hasActiveUploads}
          onRetry={retryUpload}
          onDismiss={dismissJob}
        />
      </PopoverContent>
    </Popover>
  )
}
