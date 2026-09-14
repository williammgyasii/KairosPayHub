import { useMemo, useRef, useState } from 'react'
import type { CreateServiceRecordingInput } from '@/features/media/api'
import { ServiceRecordingCategoryPicker } from '@/features/media/components/service-recording-category-picker'
import { ServiceRecordingFileDropzone } from '@/features/media/components/service-recording-file-dropzone'
import { ServiceRecordingSeriesPicker } from '@/features/media/components/service-recording-series-picker'
import { useCreateServiceRecordingMutation } from '@/features/media/api/serviceRecordingsApi'
import {
  validateServiceRecordingDescription,
  validateServiceRecordingTitle,
} from '@/features/media/lib/service-recording-form-policy'
import { useServiceRecordingUploadQueue } from '@/features/media/lib/service-recording-upload-queue'
import { validateServiceRecordingFile } from '@/features/media/lib/service-recording-upload-policy'
import {
  uploadServiceRecordingThumbnail,
  validateServiceRecordingThumbnailFile,
} from '@/features/media/lib/service-recording-thumbnail-upload'
import { formatRtkQueryError } from '@/store/baseQuery'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { DatePicker } from '@/shared/ui/date-picker'
import {
  WizardField,
  WizardFooter,
  WizardStepPanel,
  WizardStepper,
} from '@/shared/ui/wizard-shell'

const STEPS = ['Details', 'Upload'] as const

type ServiceRecordingUploadWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  existingTitles: readonly string[]
}

export function ServiceRecordingUploadWizard({
  open,
  onOpenChange,
  onComplete,
  existingTitles,
}: ServiceRecordingUploadWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [createRecording] = useCreateServiceRecordingMutation()
  const { enqueueUpload } = useServiceRecordingUploadQueue()

  const formOptions = useMemo(
    () => ({ existingTitles }),
    [existingTitles],
  )

  function reset() {
    setStep(0)
    setTitle('')
    setDescription('')
    setServiceDate('')
    setCategoryId(null)
    setSeriesId(null)
    setFile(null)
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setTitleError(null)
    setDescriptionError(null)
    setThumbnailError(null)
    setFileError(null)
    setSubmitError(null)
    setSubmitting(false)
    if (inputRef.current) inputRef.current.value = ''
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
  }

  function validateDetails() {
    const nextTitleError = validateServiceRecordingTitle(title, formOptions)
    const nextDescriptionError = validateServiceRecordingDescription(description)
    setTitleError(nextTitleError)
    setDescriptionError(nextDescriptionError)
    return !nextTitleError && !nextDescriptionError
  }

  function pickThumbnail(list: FileList | null) {
    const next = list?.[0] ?? null
    if (!next) return
    const validationError = validateServiceRecordingThumbnailFile(next)
    if (validationError) {
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setThumbnailError(validationError)
      return
    }
    setThumbnailFile(next)
    setThumbnailPreview(URL.createObjectURL(next))
    setThumbnailError(null)
  }

  function close() {
    if (submitting) return
    reset()
    onOpenChange(false)
  }

  function pickFile(list: FileList | null) {
    const next = list?.[0] ?? null
    if (!next) return
    const validationError = validateServiceRecordingFile(next)
    if (validationError) {
      setFile(null)
      setFileError(validationError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile(next)
    setFileError(null)
  }

  async function handleSubmit() {
    if (!validateDetails()) {
      setStep(0)
      return
    }
    if (!file) {
      setFileError('Choose a video file to upload.')
      return
    }

    setSubmitError(null)
    setSubmitting(true)

    const body: CreateServiceRecordingInput = {
      title: title.trim(),
      description: description.trim() || null,
      serviceDate: serviceDate.trim() || null,
      categoryId,
      seriesId,
    }

    try {
      const created = await createRecording(body).unwrap()
      if (thumbnailFile) {
        await uploadServiceRecordingThumbnail(created.id, thumbnailFile)
      }
      enqueueUpload({ created, file })
      onComplete()
      close()
    } catch (err) {
      setSubmitting(false)
      setSubmitError(formatRtkQueryError(err))
    }
  }

  function tryContinueFromDetails() {
    if (!validateDetails()) return
    setStep(1)
  }

  const canSubmit = Boolean(file && title.trim() && !titleError && !descriptionError)

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Upload recording"
      description="Your video uploads in the background. Track progress from the uploads panel."
    >
      <div className="space-y-5">
        <WizardStepper steps={STEPS} currentStep={step} variant="dots" />

        <WizardStepPanel stepKey={step} direction="forward">
          {step === 0 ? (
            <div className="space-y-4">
              <WizardField label="Title" id="recording-title" required error={titleError}>
                <Input
                  id="recording-title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    if (titleError) {
                      setTitleError(validateServiceRecordingTitle(event.target.value, formOptions))
                    }
                  }}
                  onBlur={() =>
                    setTitleError(validateServiceRecordingTitle(title, formOptions))
                  }
                  placeholder="Sunday Service"
                  autoFocus
                  disabled={submitting}
                  aria-invalid={Boolean(titleError)}
                />
              </WizardField>
              <WizardField label="Service date" id="recording-date">
                <DatePicker
                  id="recording-date"
                  value={serviceDate}
                  onChange={setServiceDate}
                  disabled={submitting}
                />
              </WizardField>
              <WizardField
                label="Description"
                id="recording-description"
                error={descriptionError}
              >
                <Input
                  id="recording-description"
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value)
                    if (descriptionError) {
                      setDescriptionError(validateServiceRecordingDescription(event.target.value))
                    }
                  }}
                  onBlur={() =>
                    setDescriptionError(validateServiceRecordingDescription(description))
                  }
                  placeholder="Optional notes for your team"
                  disabled={submitting}
                  aria-invalid={Boolean(descriptionError)}
                />
              </WizardField>
              <WizardField label="Category" id="recording-category">
                <ServiceRecordingCategoryPicker
                  value={categoryId}
                  onChange={setCategoryId}
                  disabled={submitting}
                />
              </WizardField>
              <WizardField label="Message series" id="recording-series">
                <ServiceRecordingSeriesPicker
                  value={seriesId}
                  onChange={setSeriesId}
                  disabled={submitting}
                />
              </WizardField>
              <WizardField label="Cover image" id="recording-thumbnail" error={thumbnailError}>
                <ServiceRecordingFileDropzone
                  inputRef={thumbnailInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  disabled={submitting}
                  error={thumbnailError}
                  onPick={pickThumbnail}
                  variant="cover"
                  previewUrl={thumbnailPreview}
                />
              </WizardField>
            </div>
          ) : (
            <ServiceRecordingFileDropzone
              inputRef={inputRef}
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-m4v"
              disabled={submitting}
              error={fileError ?? submitError}
              onPick={pickFile}
              variant="video"
              file={file}
            />
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={submitting}
          onCancel={close}
          onBack={() => setStep(0)}
          onNext={() => {
            if (step === 0) {
              tryContinueFromDetails()
              return
            }
            void handleSubmit()
          }}
          nextLabel="Continue"
          submitLabel="Start upload"
          isLastStep={step === STEPS.length - 1}
          canProceed={step === 0 ? title.trim().length > 0 : canSubmit}
          busyLabel="Starting…"
        />
      </div>
    </Modal>
  )
}
