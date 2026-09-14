import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import type { ServiceRecordingUploadJob } from '@/features/media/lib/service-recording-upload-queue'
import { formatUploadBytes } from '@/features/media/lib/service-recording-tus-upload'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { cn } from '@/shared/lib/utils'

type ServiceRecordingUploadJobListProps = {
  jobs: ServiceRecordingUploadJob[]
  hasActiveUploads: boolean
  onRetry: (jobId: string) => void
  onDismiss: (jobId: string) => void
}

export function ServiceRecordingUploadJobList({
  jobs,
  hasActiveUploads,
  onRetry,
  onDismiss,
}: ServiceRecordingUploadJobListProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">Uploads</p>
        {hasActiveUploads && (
          <span className="text-[11px] text-muted-foreground">Keep this tab open</span>
        )}
      </div>

      <ul className="max-h-[min(22rem,55dvh)] divide-y divide-border/60 overflow-y-auto">
        {jobs.map((job) => (
          <li key={job.id} className="space-y-2 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{job.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{job.fileName}</p>
              </div>
              {(job.status === 'completed' || job.status === 'failed') && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  onClick={() => onDismiss(job.id)}
                >
                  <X className="size-3.5" aria-hidden />
                  <span className="sr-only">Dismiss</span>
                </Button>
              )}
            </div>

            {job.status === 'uploading' && (
              <>
                <Progress value={job.progress.percent} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">
                  {formatUploadBytes(job.progress.bytesUploaded)} of{' '}
                  {formatUploadBytes(job.progress.bytesTotal)} · {job.progress.percent}%
                </p>
              </>
            )}

            {job.status === 'queued' && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Waiting to start…
              </p>
            )}

            {job.status === 'completed' && (
              <p
                className={cn(
                  'flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400',
                )}
              >
                <CheckCircle2 className="size-3.5" aria-hidden />
                Upload complete — encoding on Bunny
              </p>
            )}

            {job.status === 'failed' && (
              <div className="space-y-2">
                <p className="flex items-start gap-1.5 text-[11px] text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {job.error ?? 'Upload failed'}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => void onRetry(job.id)}
                >
                  Retry upload
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
