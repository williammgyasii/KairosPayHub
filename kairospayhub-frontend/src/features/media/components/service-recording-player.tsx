import { useGetServiceRecordingPlaybackQuery } from '@/features/media/api/serviceRecordingsApi'
import { formatRtkQueryError } from '@/store/baseQuery'
import { Spinner } from '@/shared/ui/spinner'

export function ServiceRecordingPlayer({ recordingId }: { recordingId: string }) {
  const { data, error, isLoading, isFetching } = useGetServiceRecordingPlaybackQuery(recordingId)

  if (isLoading || isFetching) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border bg-muted/20">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (error || !data?.embedUrl) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error ? formatRtkQueryError(error) : 'Playback is unavailable.'}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-black shadow-sm">
      <iframe
        title="Service recording player"
        src={data.embedUrl}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="aspect-video w-full border-0"
      />
    </div>
  )
}
