import { useRef, useState } from 'react'
import { FileText, Image, Upload, X } from 'lucide-react'
import {
  MAX_PACK_FILE_BYTES,
  MAX_PACK_FILES,
  packFileAllowed,
} from '@/features/attendance/lib/meeting-pack-policy'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export type PackDropzoneFile = {
  key: string
  name: string
  sizeBytes?: number
  contentType?: string
  pending?: boolean
}

function formatSize(bytes?: number) {
  if (bytes == null || bytes <= 0) return null
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileKindIcon({ contentType }: { contentType?: string }) {
  const Icon = contentType?.startsWith('image/') ? Image : FileText
  return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
}

export function AttendanceMeetingPackDropzone({
  files,
  remainingSlots,
  onPick,
  onRemove,
}: {
  files: PackDropzoneFile[]
  remainingSlots: number
  onPick: (list: FileList | null) => void
  onRemove: (key: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const canAdd = remainingSlots > 0

  function takeFiles(list: FileList | null) {
    onPick(list)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Files</p>
      <div
        data-testid="pack-file-dropzone"
        className={cn(
          'rounded-xl border-2 border-dashed bg-muted/20 p-3 transition-colors',
          dragging && canAdd
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30',
        )}
        onDragEnter={(event) => {
          event.preventDefault()
          if (canAdd) setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (canAdd) setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDragging(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (canAdd) takeFiles(event.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          id="pack-file-input"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          disabled={!canAdd}
          className="sr-only"
          onChange={(event) => takeFiles(event.target.files)}
        />

        <button
          type="button"
          disabled={!canAdd}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-lg px-3 py-5 text-center disabled:opacity-50"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border">
            <Upload className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-medium">
            {canAdd ? 'Tap to add PDFs or photos' : `Maximum of ${MAX_PACK_FILES} files`}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Up to {MAX_PACK_FILES} · {MAX_PACK_FILE_BYTES / (1024 * 1024)} MB each · PDF, JPEG, PNG,
            WebP
          </span>
        </button>

        {files.length > 0 ? (
          <ul className="space-y-1.5 border-t border-dashed border-muted-foreground/25 pt-3">
            {files.map((file) => (
              <li
                key={file.key}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2"
              >
                <FileKindIcon contentType={file.contentType} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[file.pending ? 'New' : null, formatSize(file.sizeBytes)]
                      .filter(Boolean)
                      .join(' · ') || 'Ready'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onRemove(file.key)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

export function acceptPackFiles(list: FileList | null, remainingSlots: number) {
  if (!list || remainingSlots <= 0) return []
  return [...list]
    .filter((file) => packFileAllowed(file.type) && file.size > 0 && file.size <= MAX_PACK_FILE_BYTES)
    .slice(0, remainingSlots)
}
