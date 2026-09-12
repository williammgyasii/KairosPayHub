import type { MeetingPack } from '@/features/attendance/api'
import { AttendanceMeetingPackFileCard } from '@/features/attendance/components/attendance-meeting-pack-file-card'
import { packReceiptStatus } from '@/features/attendance/lib/meeting-pack-policy'
import { cn } from '@/shared/lib/utils'

function statusClass(status: ReturnType<typeof packReceiptStatus>) {
  if (status === 'Downloaded') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
  }
  if (status === 'Opened') {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

export function AttendanceMeetingPackSharedTable({ pack }: { pack: MeetingPack | null }) {
  const files = pack?.files ?? []
  const receipts = pack?.receipts ?? []
  const empty = !pack

  return (
    <aside
      data-testid="share-files-shared-pane"
      className="overflow-hidden rounded-xl border border-violet-200/80 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20"
    >
      <div className="border-b border-violet-200/70 px-4 py-3 dark:border-violet-900/40">
        <h3 className="text-sm font-semibold text-violet-950 dark:text-violet-100">Shared this day</h3>
        <p className="mt-0.5 line-clamp-3 text-xs text-violet-800/80 dark:text-violet-200/70">
          {empty
            ? 'Share a note or file to see it here, plus who opened and downloaded.'
            : pack.note?.trim()
              ? pack.note
              : 'Files only — no note.'}
        </p>
      </div>

      {empty ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing shared for this day yet.
        </p>
      ) : (
        <div className="space-y-3 p-3">
          <section className="rounded-xl border border-sky-200/80 bg-white/80 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">
              Files
            </p>
            {files.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No files on this pack.</p>
            ) : (
              <ul className="divide-y divide-sky-200/70 dark:divide-sky-900/40">
                {files.map((file) => (
                  <li key={file.id}>
                    <AttendanceMeetingPackFileCard file={file} plain />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-emerald-200/80 bg-white/80 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Who used it
            </p>
            {receipts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No leaders in scope yet.</p>
            ) : (
              <ul className="space-y-2">
                {receipts.map((row) => {
                  const status = packReceiptStatus(row)
                  return (
                    <li
                      key={row.authUserId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                    >
                      <span className="min-w-0 truncate text-sm font-medium">{row.name}</span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                          statusClass(status),
                        )}
                      >
                        {status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </aside>
  )
}
