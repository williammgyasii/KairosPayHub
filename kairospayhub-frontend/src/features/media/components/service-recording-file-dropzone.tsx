import type { DragEvent, RefObject } from 'react'
import { ImagePlus, Upload, Video } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type ServiceRecordingFileDropzoneProps = {
  inputRef: RefObject<HTMLInputElement | null>
  accept: string
  disabled?: boolean
  error?: string | null
  onPick: (files: FileList | null) => void
  variant: 'cover' | 'video'
  file?: File | null
  previewUrl?: string | null
  className?: string
}

export function ServiceRecordingFileDropzone({
  inputRef,
  accept,
  disabled = false,
  error,
  onPick,
  variant,
  file,
  previewUrl,
  className,
}: ServiceRecordingFileDropzoneProps) {
  function openPicker() {
    if (disabled) return
    inputRef.current?.click()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (disabled) return
    onPick(event.dataTransfer.files)
  }

  const isCover = variant === 'cover'
  const hasError = Boolean(error)

  return (
    <div className={cn('space-y-1.5', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onPick(event.target.files)}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={isCover ? 'Choose cover image' : 'Choose video file'}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={handleDrop}
        className={cn(
          'group relative overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          isCover ? 'aspect-video' : 'p-6 text-center',
          hasError
            ? 'border-destructive/60 bg-destructive/5'
            : file || previewUrl
              ? 'border-primary/40 bg-muted/20'
              : 'border-muted-foreground/30 bg-muted/20 hover:border-primary/35 hover:bg-muted/30',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        {isCover && previewUrl ? (
          <>
            <img src={previewUrl} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
              <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                <ImagePlus className="size-3.5" aria-hidden />
                Change cover
              </span>
            </div>
          </>
        ) : isCover ? (
          <div className="flex size-full flex-col items-center justify-center gap-1 px-4 text-center">
            <ImagePlus className="size-7 text-muted-foreground/80" aria-hidden />
            <p className="text-xs font-medium text-muted-foreground">Click or drop a cover image</p>
            <p className="text-[11px] text-muted-foreground/80">JPEG, PNG, or WebP · up to 5 MB</p>
          </div>
        ) : (
          <>
            <Video className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">
              {file ? file.name : 'Click or drop a video file'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">MP4, MOV, or WebM · up to 6 GB</p>
            {file && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <Upload className="size-3" aria-hidden />
                Click to replace
              </p>
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
