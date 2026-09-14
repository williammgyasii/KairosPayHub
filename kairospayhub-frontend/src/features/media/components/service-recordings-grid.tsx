import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, MoreVertical, Play, Video } from 'lucide-react'
import type { ServiceRecordingListItem } from '@/features/media/api'
import { ServiceRecordingEncodingOverlay } from '@/features/media/components/service-recording-encoding-overlay'
import { ServiceRecordingUploadOverlay } from '@/features/media/components/service-recording-upload-overlay'
import { serviceRecordingAccessFor } from '@/features/media/lib/service-recording-access-policy'
import {
  serviceRecordingTileOverlay,
  serviceRecordingTileShowsPlay,
} from '@/features/media/lib/service-recording-tile-policy'
import {
  useServiceRecordingUploadQueue,
  type ServiceRecordingUploadJob,
} from '@/features/media/lib/service-recording-upload-queue'
import {
  formatServiceRecordingDate,
  formatServiceRecordingDuration,
  formatServiceRecordingViewCount,
  serviceRecordingPublishLabel,
  serviceRecordingStatusLabel,
} from '@/features/media/lib/service-recording-ui'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cn } from '@/shared/lib/utils'

type ServiceRecordingsGridProps = {
  recordings: ServiceRecordingListItem[]
  canManage: boolean
  actionBusy: boolean
  onPublish: (recordingId: string) => void
  onUnpublish: (recordingId: string) => void
  onEdit: (recording: ServiceRecordingListItem) => void
  onDelete: (recording: ServiceRecordingListItem) => void
  onThumbnailChange: (recordingId: string, file: File) => void
}

export function ServiceRecordingsGrid({
  recordings,
  canManage,
  actionBusy,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  onThumbnailChange,
}: ServiceRecordingsGridProps) {
  const { uploadJobByRecordingId } = useServiceRecordingUploadQueue()

  if (recordings.length === 0) {
    return null
  }

  return (
    <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recordings.map((recording) => (
        <RecordingTile
          key={recording.id}
          recording={recording}
          uploadJob={uploadJobByRecordingId.get(recording.id)}
          canManage={canManage}
          actionBusy={actionBusy}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          onEdit={onEdit}
          onDelete={onDelete}
          onThumbnailChange={onThumbnailChange}
        />
      ))}
    </div>
  )
}

function RecordingTile({
  recording,
  uploadJob,
  canManage,
  actionBusy,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  onThumbnailChange,
}: {
  recording: ServiceRecordingListItem
  uploadJob?: ServiceRecordingUploadJob
  canManage: boolean
  actionBusy: boolean
  onPublish: (recordingId: string) => void
  onUnpublish: (recordingId: string) => void
  onEdit: (recording: ServiceRecordingListItem) => void
  onDelete: (recording: ServiceRecordingListItem) => void
  onThumbnailChange: (recordingId: string, file: File) => void
}) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const dateLabel =
    formatServiceRecordingDate(recording.serviceDate) ??
    formatServiceRecordingDate(recording.createdAt.slice(0, 10))
  const duration = formatServiceRecordingDuration(recording.durationSeconds)
  const access = serviceRecordingAccessFor(canManage, recording.status, recording.publishedAt)
  const tileOverlay = serviceRecordingTileOverlay(recording.status, uploadJob)
  const isUploading = tileOverlay === 'uploading'
  const isBlocked = tileOverlay !== null
  const canOpenDetail = !isUploading && access.canViewDetail
  const showPlayAffordance = serviceRecordingTileShowsPlay(recording.status)
  const hasMenu = canManage && !isUploading
  const tileBusy = actionBusy || isUploading

  function pickThumbnail(list: FileList | null) {
    const file = list?.[0]
    if (!file) return
    onThumbnailChange(recording.id, file)
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
  }

  const thumbnailBody = (
    <>
      <RecordingThumbnail
        title={recording.title}
        thumbnailUrl={recording.thumbnailUrl}
        duration={duration}
      />
      {showPlayAffordance ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/thumb:bg-black/20">
          <span className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100">
            <Play className="ml-0.5 size-5 fill-current" aria-hidden />
          </span>
        </div>
      ) : null}
    </>
  )

  return (
    <article className={cn('group space-y-2', isBlocked && 'opacity-80')}>
      <div className="group/thumb relative aspect-video overflow-hidden rounded-lg border border-border/70 bg-muted shadow-sm">
        {canOpenDetail ? (
          <Link
            to={`/media/recordings/${recording.id}`}
            className="block size-full"
          >
            {thumbnailBody}
          </Link>
        ) : (
          <div className="size-full">{thumbnailBody}</div>
        )}

        {uploadJob ? <ServiceRecordingUploadOverlay job={uploadJob} /> : null}
        {tileOverlay === 'encoding' || tileOverlay === 'awaiting-upload' || tileOverlay === 'failed' ? (
          <ServiceRecordingEncodingOverlay variant={tileOverlay} />
        ) : null}

        {hasMenu && (
          <>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => pickThumbnail(event.target.files)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className={cn(
                    'absolute right-2 top-2 size-8 bg-black/60 text-white hover:bg-black/75',
                    'opacity-100 sm:opacity-0 sm:group-hover/thumb:opacity-100',
                  )}
                  disabled={tileBusy}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical className="size-4" aria-hidden />
                  <span className="sr-only">Recording actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[120]">
                <DropdownMenuItem disabled={tileBusy} onClick={() => onEdit(recording)}>
                  Edit details
                </DropdownMenuItem>
                {access.canPublish && (
                  <DropdownMenuItem disabled={tileBusy} onClick={() => onPublish(recording.id)}>
                    Publish
                  </DropdownMenuItem>
                )}
                {access.canUnpublish && (
                  <DropdownMenuItem
                    disabled={tileBusy}
                    onClick={() => onUnpublish(recording.id)}
                  >
                    Unpublish
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={tileBusy}
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 size-4" aria-hidden />
                  {recording.thumbnailUrl ? 'Change cover image' : 'Add cover image'}
                </DropdownMenuItem>
                {access.canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={tileBusy}
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(recording)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <div className="space-y-1 px-0.5">
        {canOpenDetail ? (
          <Link
            to={`/media/recordings/${recording.id}`}
            className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-foreground/90 hover:underline"
          >
            {recording.title}
          </Link>
        ) : (
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-foreground/90">
            {recording.title}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {canManage && recording.status !== 'Ready' && (
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {serviceRecordingStatusLabel(recording.status)}
            </Badge>
          )}
          {canManage && (
            <Badge
              variant={recording.publishedAt ? 'default' : 'secondary'}
              className="rounded-full px-2 py-0 text-[10px] font-medium"
            >
              {serviceRecordingPublishLabel(recording.publishedAt)}
            </Badge>
          )}
          {(canManage || recording.publishedAt) && (
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {formatServiceRecordingViewCount(recording.playCount)}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {recording.category && <span>{recording.category.name}</span>}
          {recording.category && recording.series && <span aria-hidden>·</span>}
          {recording.series && <span>{recording.series.name}</span>}
          {(recording.category || recording.series) && dateLabel && <span aria-hidden>·</span>}
          {dateLabel && <span>{dateLabel}</span>}
        </div>
      </div>
    </article>
  )
}

function RecordingThumbnail({
  title,
  thumbnailUrl,
  duration,
}: {
  title: string
  thumbnailUrl?: string | null
  duration: string | null
}) {
  return (
    <>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/40 text-muted-foreground">
          <Video className="size-8 opacity-50" aria-hidden />
          <span className="line-clamp-2 px-4 text-center text-xs">{title}</span>
        </div>
      )}
      {duration && (
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {duration}
        </span>
      )}
    </>
  )
}
