import { useEffect, useState } from 'react'
import type { ServiceRecordingListItem } from '@/features/media/api'
import { ServiceRecordingCategoryPicker } from '@/features/media/components/service-recording-category-picker'
import { ServiceRecordingSeriesPicker } from '@/features/media/components/service-recording-series-picker'
import { useUpdateServiceRecordingMutation } from '@/features/media/api/serviceRecordingsApi'
import { formatRtkQueryError } from '@/store/baseQuery'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { DatePicker } from '@/shared/ui/date-picker'
import { Button } from '@/shared/ui/button'

type ServiceRecordingEditModalProps = {
  recording: ServiceRecordingListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function ServiceRecordingEditModal({
  recording,
  open,
  onOpenChange,
  onSaved,
}: ServiceRecordingEditModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [updateRecording, { isLoading }] = useUpdateServiceRecordingMutation()

  useEffect(() => {
    if (!recording || !open) return
    setTitle(recording.title)
    setDescription(recording.description ?? '')
    setServiceDate(recording.serviceDate ?? '')
    setCategoryId(recording.category?.id ?? null)
    setSeriesId(recording.series?.id ?? null)
    setSubmitError(null)
  }, [recording, open])

  function close() {
    if (isLoading) return
    onOpenChange(false)
  }

  async function handleSave() {
    if (!recording || !title.trim()) return
    setSubmitError(null)

    try {
      await updateRecording({
        recordingId: recording.id,
        title: title.trim(),
        description: description.trim() || null,
        serviceDate: serviceDate.trim() || null,
        categoryId,
        seriesId,
      }).unwrap()
      onSaved?.()
      close()
    } catch (err) {
      setSubmitError(formatRtkQueryError(err))
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Edit recording"
      description="Update title, description, date, category, and series."
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="edit-recording-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="edit-recording-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-recording-date" className="text-sm font-medium">
            Service date
          </label>
          <DatePicker
            id="edit-recording-date"
            value={serviceDate}
            onChange={setServiceDate}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-recording-description" className="text-sm font-medium">
            Description
          </label>
          <Input
            id="edit-recording-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional notes for your team"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="recording-category" className="text-sm font-medium">
            Category
          </label>
          <ServiceRecordingCategoryPicker
            value={categoryId}
            onChange={setCategoryId}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="recording-series" className="text-sm font-medium">
            Message series
          </label>
          <ServiceRecordingSeriesPicker
            value={seriesId}
            onChange={setSeriesId}
            disabled={isLoading}
          />
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" disabled={isLoading} onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isLoading || !title.trim()}
            onClick={() => void handleSave()}
          >
            {isLoading ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
