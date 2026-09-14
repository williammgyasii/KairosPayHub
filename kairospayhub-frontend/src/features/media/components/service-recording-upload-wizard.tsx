import { useRef, useState } from 'react'
import { ImagePlus, Upload, Video } from 'lucide-react'
import {
  uploadServiceRecordingVideo,
  type CreateServiceRecordingInput,
} from '@/features/media/api'
import { ServiceRecordingCategoryPicker } from '@/features/media/components/service-recording-category-picker'
import { ServiceRecordingSeriesPicker } from '@/features/media/components/service-recording-series-picker'
import { useCreateServiceRecordingMutation } from '@/features/media/api/serviceRecordingsApi'
import {
  validateServiceRecordingFile,
} from '@/features/media/lib/service-recording-upload-policy'
import {
  uploadServiceRecordingThumbnail,
  validateServiceRecordingThumbnailFile,
} from '@/features/media/lib/service-recording-thumbnail-upload'
import { formatRtkQueryError } from '@/store/baseQuery'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { DatePicker } from '@/shared/ui/date-picker'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import {
  WizardField,
  WizardFooter,
  WizardProgressBar,
  WizardStepPanel,
  WizardStepper,
} from '@/shared/ui/wizard-shell'
import { cn } from '@/shared/lib/utils'

const STEPS = ['Details', 'Upload'] as const

type ServiceRecordingUploadWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function ServiceRecordingUploadWizard({
  open,
  onOpenChange,
  onComplete,
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
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'creating' | 'uploading' | 'done'>('idle')

  const [createRecording, { isLoading: creating }] = useCreateServiceRecordingMutation()
  const busy = creating || phase === 'uploading'

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
    setThumbnailError(null)
    setFileError(null)
    setSubmitError(null)
    setUploadPercent(0)
    setPhase('idle')
    if (inputRef.current) inputRef.current.value = ''
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
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
    if (busy) return
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
      return
    }
    setFile(next)
    setFileError(null)
  }

  async function handleSubmit() {
    if (!file || !title.trim()) return
    setSubmitError(null)
    setPhase('creating')

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
      setPhase('uploading')
      setUploadPercent(0)
      await uploadServiceRecordingVideo(
        created.uploadUrl,
        created.uploadAccessKey,
        file,
        setUploadPercent,
      )
      setPhase('done')
      onComplete()
      close()
    } catch (err) {
      setPhase('idle')
      setSubmitError(formatRtkQueryError(err))
    }
  }

  const canContinueStep0 = title.trim().length > 0
  const canSubmit = Boolean(file && title.trim())

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Upload recording"
      description="Send the video directly to Bunny Stream. Encoding starts after upload finishes."
    >
      <div className="space-y-5">
        <WizardStepper steps={STEPS} currentStep={step} variant="dots" />

        {busy && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {phase === 'creating' ? 'Creating upload…' : 'Uploading video…'}
            </p>
            <WizardProgressBar value={phase === 'creating' ? 15 : uploadPercent} />
          </div>
        )}

        <WizardStepPanel stepKey={step} direction="forward">
          {step === 0 ? (
            <div className="space-y-4">
              <WizardField label="Title" id="recording-title" required>
                <Input
                  id="recording-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Sunday Service"
                  autoFocus
                />
              </WizardField>
              <WizardField label="Service date" id="recording-date">
                <DatePicker
                  id="recording-date"
                  value={serviceDate}
                  onChange={setServiceDate}
                />
              </WizardField>
              <WizardField label="Description" id="recording-description">
                <Input
                  id="recording-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional notes for your team"
                />
              </WizardField>
              <WizardField label="Category" id="recording-category">
                <ServiceRecordingCategoryPicker
                  value={categoryId}
                  onChange={setCategoryId}
                  disabled={busy}
                />
              </WizardField>
              <WizardField label="Message series" id="recording-series">
                <ServiceRecordingSeriesPicker
                  value={seriesId}
                  onChange={setSeriesId}
                  disabled={busy}
                />
              </WizardField>
              <WizardField label="Cover image" id="recording-thumbnail">
                <div className="space-y-2">
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => pickThumbnail(event.target.files)}
                  />
                  {thumbnailPreview ? (
                    <div className="relative aspect-video overflow-hidden rounded-lg border border-border/70 bg-muted">
                      <img
                        src={thumbnailPreview}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/20">
                      <p className="text-xs text-muted-foreground">Optional cover image</p>
                      <p className="text-[11px] text-muted-foreground/80">JPEG, PNG, or WebP · up to 5 MB</p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-1.5 size-4" aria-hidden />
                    {thumbnailFile ? 'Change cover image' : 'Choose cover image'}
                  </Button>
                  {thumbnailError && (
                    <p className="text-sm text-destructive">{thumbnailError}</p>
                  )}
                </div>
              </WizardField>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                data-testid="recording-file-dropzone"
                className={cn(
                  'rounded-xl border-2 border-dashed bg-muted/20 p-6 text-center transition-colors',
                  file ? 'border-primary/40' : 'border-muted-foreground/30',
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-m4v"
                  className="sr-only"
                  onChange={(event) => pickFile(event.target.files)}
                />
                <Video className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">
                  {file ? file.name : 'Drop a video file or browse'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  MP4, MOV, or WebM · up to 2 GB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                >
                  <Upload className="mr-1.5 size-4" aria-hidden />
                  Choose file
                </Button>
              </div>
              {file && (
                <Progress value={uploadPercent} className={phase === 'uploading' ? 'h-2' : 'hidden'} />
              )}
              {fileError && <p className="text-sm text-destructive">{fileError}</p>}
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            </div>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          onCancel={close}
          onBack={() => setStep(0)}
          onNext={() => {
            if (step === 0) {
              if (!canContinueStep0) return
              setStep(1)
              return
            }
            void handleSubmit()
          }}
          nextLabel="Continue"
          submitLabel="Upload"
          isLastStep={step === STEPS.length - 1}
          canProceed={step === 0 ? canContinueStep0 : canSubmit}
          busyLabel={phase === 'creating' ? 'Creating…' : 'Uploading…'}
        />
      </div>
    </Modal>
  )
}
