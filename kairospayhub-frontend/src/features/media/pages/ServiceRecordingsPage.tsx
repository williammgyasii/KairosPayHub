import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Video } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { canManageChurch } from '@/api/auth'
import { ServiceRecordingCategoryFilters } from '@/features/media/components/service-recording-category-filters'
import { ServiceRecordingEditModal } from '@/features/media/components/service-recording-edit-modal'
import { ServiceRecordingSeriesFilters } from '@/features/media/components/service-recording-series-filters'
import { ServiceRecordingUploadWizard } from '@/features/media/components/service-recording-upload-wizard'
import { ServiceRecordingsGrid } from '@/features/media/components/service-recordings-grid'
import type { ServiceRecordingListItem } from '@/features/media/api'
import { useListServiceRecordingCategoriesQuery } from '@/features/media/api/serviceRecordingCategoriesApi'
import { useListServiceRecordingSeriesQuery } from '@/features/media/api/serviceRecordingSeriesApi'
import {
  useDeleteServiceRecordingMutation,
  useListServiceRecordingsQuery,
  usePublishServiceRecordingMutation,
  useUnpublishServiceRecordingMutation,
} from '@/features/media/api/serviceRecordingsApi'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Spinner } from '@/shared/ui/spinner'
import { uploadServiceRecordingThumbnail } from '@/features/media/lib/service-recording-thumbnail-upload'
import { formatRtkQueryError } from '@/store/baseQuery'
import { invalidateServiceRecordingTags } from '@/features/media/api/serviceRecordingsApi'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
import { useDispatch } from 'react-redux'

const PAGE_SIZE = 24

export function ServiceRecordingsPage() {
  const dispatch = useDispatch()
  const { me } = useOutletContext<DashboardOutletContext>()
  const canManage = me.onboarded && canManageChurch(me.role)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [editingRecording, setEditingRecording] = useState<ServiceRecordingListItem | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const debouncedSearch = useDebouncedValue(searchInput, 300)

  const { data: categories = [] } = useListServiceRecordingCategoriesQuery()
  const { data: series = [] } = useListServiceRecordingSeriesQuery()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedCategoryId, selectedSeriesId])

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useListServiceRecordingsQuery({
    q: debouncedSearch || undefined,
    categoryId: selectedCategoryId ?? undefined,
    seriesId: selectedSeriesId ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const recordings = data?.recordings ?? []
  const total = data?.total ?? 0
  const hasMore = recordings.length < total

  const [publishRecording, { isLoading: publishing }] = usePublishServiceRecordingMutation()
  const [unpublishRecording, { isLoading: unpublishing }] = useUnpublishServiceRecordingMutation()
  const [deleteRecording, { isLoading: deleting }] = useDeleteServiceRecordingMutation()

  const actionBusy = publishing || unpublishing || deleting
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId)
  const selectedSeries = series.find((item) => item.id === selectedSeriesId)

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !hasMore || isFetching) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((current) => current + 1)
        }
      },
      { rootMargin: '240px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, isFetching, recordings.length])

  async function handleDelete(recording: ServiceRecordingListItem) {
    if (!window.confirm(`Delete "${recording.title}"? This cannot be undone.`)) {
      return
    }
    await deleteRecording(recording.id).unwrap()
  }

  async function handleThumbnailChange(recordingId: string, file: File) {
    try {
      await uploadServiceRecordingThumbnail(recordingId, file)
      dispatch(invalidateServiceRecordingTags(recordingId))
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Thumbnail upload failed')
    }
  }

  const emptyMessage = (() => {
    if (debouncedSearch.trim()) {
      return `No recordings match "${debouncedSearch.trim()}".`
    }
    if (selectedCategory && selectedSeries) {
      return `No recordings in ${selectedCategory.name} · ${selectedSeries.name} yet.`
    }
    if (selectedCategory) {
      return `No recordings in ${selectedCategory.name} yet.`
    }
    if (selectedSeries) {
      return `No recordings in ${selectedSeries.name} yet.`
    }
    return canManage
      ? 'Upload a finished service video. When encoding finishes, click Publish on the thumbnail for the church to see it.'
      : 'No published recordings yet. Your church admin will share services here after publishing.'
  })()

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Recordings"
        description={
          canManage
            ? 'Upload Sunday services and publish them for your church to watch inside Kairos.'
            : 'Watch published services from your church.'
        }
        actions={
          canManage ? (
            <Button type="button" onClick={() => setUploadOpen(true)}>
              <Plus className="mr-1.5 size-4" aria-hidden />
              Upload
            </Button>
          ) : undefined
        }
      />

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search recordings…"
          className="pl-9"
          aria-label="Search recordings"
        />
      </div>

      <ServiceRecordingCategoryFilters
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onChange={setSelectedCategoryId}
      />

      <ServiceRecordingSeriesFilters
        series={series}
        selectedSeriesId={selectedSeriesId}
        onChange={setSelectedSeriesId}
      />

      {isLoading && page === 1 ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {formatRtkQueryError(error)}
        </div>
      ) : (
        <>
          <ServiceRecordingsGrid
            recordings={recordings}
            canManage={canManage}
            actionBusy={actionBusy}
            onPublish={(id) => void publishRecording(id)}
            onUnpublish={(id) => void unpublishRecording(id)}
            onEdit={setEditingRecording}
            onDelete={(recording) => void handleDelete(recording)}
            onThumbnailChange={(id, file) => void handleThumbnailChange(id, file)}
          />

          {recordings.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Video className="size-8 opacity-60" aria-hidden />
              <p>{emptyMessage}</p>
            </div>
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {isFetching ? <Spinner className="size-5" /> : null}
            </div>
          )}
        </>
      )}

      {canManage && (
        <>
          <ServiceRecordingUploadWizard
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            onComplete={() => void refetch()}
          />
          <ServiceRecordingEditModal
            recording={editingRecording}
            open={editingRecording !== null}
            onOpenChange={(open) => {
              if (!open) setEditingRecording(null)
            }}
            onSaved={() => void refetch()}
          />
        </>
      )}
    </div>
  )
}
