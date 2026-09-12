import { useCallback, useEffect, useState } from 'react'
import type { MeetingPack, MeetingPackFile } from '@/features/attendance/api'
import {
  downloadMeetingPackFile,
  getMeetingPack,
  publishMeetingPack,
} from '@/features/attendance/api'
import { AttendanceMeetingPackFileCard } from '@/features/attendance/components/attendance-meeting-pack-file-card'
import {
  MAX_PACK_FILES,
  canPublishMeetingPack,
  leaderCanContinuePastPack,
  packIsComplete,
} from '@/features/attendance/lib/meeting-pack-policy'
import { useApi } from '@/shared/api'
import {
  AttendanceMeetingPackDropzone,
  acceptPackFiles,
} from '@/features/attendance/components/attendance-meeting-pack-dropzone'
import { AttendanceMeetingPackSharedTable } from '@/features/attendance/components/attendance-meeting-pack-shared-table'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { cn } from '@/shared/lib/utils'

export function AttendanceMeetingPackPanel({
  occurrenceId,
  canManageChurch,
  embedded = false,
  onViewerChange,
}: {
  occurrenceId: string
  canManageChurch: boolean
  embedded?: boolean
  onViewerChange?: (canContinue: boolean) => void
}) {
  const api = useApi()
  const canPublish = canPublishMeetingPack(canManageChurch)
  const [pack, setPack] = useState<MeetingPack | null>(null)
  const [note, setNote] = useState('')
  const [keptFiles, setKeptFiles] = useState<MeetingPackFile[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!occurrenceId) return
    setLoading(true)
    setError(null)
    try {
      const next = await getMeetingPack(api, occurrenceId)
      setPack(next)
      setNote(next.note ?? '')
      setKeptFiles(next.files)
      setNewFiles([])
    } catch {
      setPack(null)
      setNote('')
      setKeptFiles([])
      setNewFiles([])
    } finally {
      setLoading(false)
    }
  }, [api, occurrenceId])

  useEffect(() => {
    void load()
  }, [load])

  const fileCount = keptFiles.length + newFiles.length
  const canShare = packIsComplete(note, fileCount) && fileCount <= MAX_PACK_FILES
  const viewerReady = leaderCanContinuePastPack(pack)

  useEffect(() => {
    if (!onViewerChange || canPublish || loading) return
    onViewerChange(viewerReady)
  }, [canPublish, loading, onViewerChange, viewerReady])

  async function onShare() {
    setBusy(true)
    setError(null)
    try {
      const next = await publishMeetingPack(occurrenceId, {
        note,
        keepFileIds: keptFiles.map((file) => file.id),
        files: newFiles,
      })
      setPack(next)
      setNote(next.note ?? '')
      setKeptFiles(next.files)
      setNewFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share files')
    } finally {
      setBusy(false)
    }
  }

  function onPickFiles(list: FileList | null) {
    const remaining = MAX_PACK_FILES - keptFiles.length - newFiles.length
    const accepted = acceptPackFiles(list, remaining)
    if (accepted.length === 0) return
    setNewFiles((current) => [...current, ...accepted])
  }

  function onRemoveFile(key: string) {
    if (key.startsWith('new:')) {
      const index = Number(key.split(':')[1])
      setNewFiles((current) => current.filter((_, i) => i !== index))
      return
    }
    setKeptFiles((current) => current.filter((row) => row.id !== key))
  }

  if (!occurrenceId) return null
  if (loading) return <p className="text-sm text-muted-foreground">Loading notes…</p>

  if (!canPublish && !pack) return null

  const compose = canPublish ? (
    <div className="space-y-3">
      {embedded ? (
        <p className="text-xs text-muted-foreground">
          Leaders in this meeting’s scope get a notification. You will see who opened and who
          downloaded.
        </p>
      ) : (
        <div>
          <h3 className="text-sm font-semibold">Share files for this meeting</h3>
          <p className="text-xs text-muted-foreground">
            Leaders in this meeting’s scope get a notification. You will see who opened and who
            downloaded.
          </p>
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Label htmlFor={`pack-note-${occurrenceId}`} className="text-xs text-muted-foreground">
        Note
      </Label>
      <Textarea
        id={`pack-note-${occurrenceId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        placeholder="What should be taught this week…"
      />
      <AttendanceMeetingPackDropzone
        files={[
          ...keptFiles.map((file) => ({
            key: file.id,
            name: file.fileName,
            sizeBytes: file.sizeBytes,
            contentType: file.contentType,
          })),
          ...newFiles.map((file, index) => ({
            key: `new:${index}:${file.name}`,
            name: file.name,
            sizeBytes: file.size,
            contentType: file.type,
            pending: true,
          })),
        ]}
        remainingSlots={MAX_PACK_FILES - keptFiles.length - newFiles.length}
        onPick={onPickFiles}
        onRemove={onRemoveFile}
      />
      <Button type="button" size="sm" disabled={!canShare || busy} onClick={() => void onShare()}>
        {pack ? 'Update pack' : 'Share'}
      </Button>
    </div>
  ) : (
    <div className="min-w-0 space-y-3 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
      <div>
        <h3 className="text-sm font-semibold text-sky-950 dark:text-sky-100">Notes for this meeting</h3>
        <p className="text-xs text-sky-800/80 dark:text-sky-200/70">
          Download a file before you mark attendance. Your pastor can see that you used it.
        </p>
      </div>
      {pack?.note ? (
        <p className="whitespace-pre-wrap break-words text-sm">{pack.note}</p>
      ) : null}
      <ul className="divide-y divide-sky-200/70 dark:divide-sky-900/40">
        {(pack?.files ?? []).map((file) => (
          <li key={file.id} className="min-w-0">
            <AttendanceMeetingPackFileCard
              file={file}
              plain
              onDownload={() => {
                void downloadMeetingPackFile(occurrenceId, file.id, file.fileName).then(() => {
                  setPack((current) =>
                    current
                      ? {
                          ...current,
                          viewerDownloadedAt:
                            current.viewerDownloadedAt ?? new Date().toISOString(),
                        }
                      : current,
                  )
                })
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <section
      data-testid={embedded && canPublish ? 'share-files-split' : undefined}
      className={cn(
        embedded && canPublish
          ? 'grid gap-6 lg:grid-cols-2 lg:items-start'
          : 'min-w-0 space-y-3',
      )}
    >
      {compose}
      {canPublish ? <AttendanceMeetingPackSharedTable pack={pack} /> : null}
    </section>
  )
}
