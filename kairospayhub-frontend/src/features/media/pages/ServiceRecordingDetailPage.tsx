import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { canManageChurch } from '@/api/auth'
import { ServiceRecordingPlayer } from '@/features/media/components/service-recording-player'
import {
  useDeleteServiceRecordingMutation,
  useGetServiceRecordingQuery,
  usePublishServiceRecordingMutation,
  useUnpublishServiceRecordingMutation,
} from '@/features/media/api/serviceRecordingsApi'
import {
  formatServiceRecordingDate,
  formatServiceRecordingDuration,
  formatServiceRecordingViewCount,
  serviceRecordingPublishLabel,
} from '@/features/media/lib/service-recording-ui'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { formatRtkQueryError } from '@/store/baseQuery'

export function ServiceRecordingDetailPage() {
  const { recordingId = '' } = useParams<{ recordingId: string }>()
  const navigate = useNavigate()
  const { me } = useOutletContext<DashboardOutletContext>()
  const canManage = me.onboarded && canManageChurch(me.role)

  const { data: recording, error, isLoading } = useGetServiceRecordingQuery(recordingId, {
    skip: !recordingId,
  })
  const [publishRecording, { isLoading: publishing }] = usePublishServiceRecordingMutation()
  const [unpublishRecording, { isLoading: unpublishing }] = useUnpublishServiceRecordingMutation()
  const [deleteRecording, { isLoading: deleting }] = useDeleteServiceRecordingMutation()

  const actionBusy = publishing || unpublishing || deleting

  async function handleDelete() {
    if (!recording || !window.confirm(`Delete "${recording.title}"? This cannot be undone.`)) {
      return
    }
    await deleteRecording(recording.id).unwrap()
    navigate('/media/recordings')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (error || !recording) {
    return (
      <div className="space-y-4">
        <DashboardPageHeader title="Recording" onBack={() => navigate('/media/recordings')} />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ? formatRtkQueryError(error) : 'Recording not found.'}
        </div>
      </div>
    )
  }

  const dateLabel =
    formatServiceRecordingDate(recording.serviceDate) ??
    formatServiceRecordingDate(recording.createdAt.slice(0, 10))
  const duration = formatServiceRecordingDuration(recording.durationSeconds)
  const access = recording.access

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={recording.title}
        description={[dateLabel, duration].filter(Boolean).join(' · ')}
        onBack={() => navigate('/media/recordings')}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {access.canPublish && (
                <Button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void publishRecording(recording.id)}
                >
                  Publish
                </Button>
              )}
              {access.canUnpublish && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionBusy}
                  onClick={() => void unpublishRecording(recording.id)}
                >
                  Unpublish
                </Button>
              )}
              {access.canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={actionBusy}
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {recording.category && (
          <Badge variant="outline">{recording.category.name}</Badge>
        )}
        {canManage && (
          <Badge variant={recording.publishedAt ? 'default' : 'secondary'}>
            {serviceRecordingPublishLabel(recording.publishedAt)}
          </Badge>
        )}
        {(canManage || recording.publishedAt) && (
          <Badge variant="outline">{formatServiceRecordingViewCount(recording.playCount)}</Badge>
        )}
        {recording.description && (
          <p className="text-sm text-muted-foreground">{recording.description}</p>
        )}
      </div>

      {access.canWatchPlayback ? (
        <ServiceRecordingPlayer recordingId={recording.id} />
      ) : (
        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          {recording.status === 'Processing'
            ? 'This recording is still encoding. Check back soon.'
            : recording.status === 'Failed'
              ? 'Encoding failed. Upload again or contact your church admin.'
              : 'Publish this recording when you are ready for the church to watch it.'}
        </div>
      )}
    </div>
  )
}
