import { Download, FileText, Image } from 'lucide-react'
import type { MeetingPackFile } from '@/features/attendance/api'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export function formatPackFileSize(bytes?: number) {
  if (bytes == null || bytes <= 0) return '—'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PackFileThumb({
  contentType,
  className,
}: {
  contentType?: string
  className?: string
}) {
  const image = Boolean(contentType?.startsWith('image/'))
  return (
    <span
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl',
        image
          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
        className,
      )}
      aria-hidden
    >
      {image ? <Image className="size-5" /> : <FileText className="size-5" />}
    </span>
  )
}

export function AttendanceMeetingPackFileCard({
  file,
  onDownload,
  plain = false,
}: {
  file: MeetingPackFile
  onDownload?: () => void
  plain?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 py-2.5',
        !plain &&
          'rounded-xl border border-sky-200/80 bg-sky-50/70 px-3 dark:border-sky-900/60 dark:bg-sky-950/40',
      )}
    >
      <PackFileThumb contentType={file.contentType} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.fileName}</p>
        <p className="text-[11px] text-sky-800/80 dark:text-sky-200/70">
          {formatPackFileSize(file.sizeBytes)}
        </p>
      </div>
      {onDownload ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-9 shrink-0 bg-sky-600 text-white hover:bg-sky-600/90"
          aria-label={`Download ${file.fileName}`}
          onClick={onDownload}
        >
          <Download className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
