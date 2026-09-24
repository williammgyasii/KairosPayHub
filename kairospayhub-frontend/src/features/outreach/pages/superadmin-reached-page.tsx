import { useEffect, useState } from 'react'
import { operatorGet } from '@/features/outreach/lib/operator-session'
import { OperatorShell } from '@/features/outreach/components/operator-shell'
import type { SearchLead } from '@/features/outreach/components/search-leads-table'
import { cn } from '@/shared/lib/utils'

type ReachedPageResult = {
  churches: SearchLead[]
  totalCount: number
}

export function SuperadminReachedPage() {
  const [rows, setRows] = useState<SearchLead[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    operatorGet<ReachedPageResult>('/api/outreach/churches?saved=true&reached=true&page=1&pageSize=50')
      .then((result) => {
        if (cancelled) return
        setRows(result.churches.filter((church) => Boolean(church.sentAt)))
        setActiveId((current) => current ?? result.churches[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const active = rows.find((row) => row.id === activeId) ?? null

  return (
    <OperatorShell>
      <main className="flex h-full min-h-0 w-full overflow-hidden bg-card">
        <aside className="flex w-80 shrink-0 flex-col border-r bg-card">
          <p className="shrink-0 border-b px-5 py-4 text-sm font-medium">Reached churches</p>
          {rows.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">No churches have been reached yet.</p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left text-sm',
                      row.id === activeId ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                    onClick={() => setActiveId(row.id)}
                  >
                    <span className="block font-medium">{row.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{row.sentSubject || row.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
          {active ? (
            <>
              <header className="shrink-0 border-b bg-card px-6 py-4">
                <h1 className="text-base font-semibold">{active.name}</h1>
                <p className="text-xs text-muted-foreground">{active.email}</p>
              </header>
              <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-y-auto p-6">
                <div className="ml-auto max-w-lg rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">
                  {active.sentSubject ? <p className="mb-1 font-medium">{active.sentSubject}</p> : null}
                  <p className="whitespace-pre-wrap">{active.sentBody || 'This note was sent before the message was stored.'}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="m-auto text-sm text-muted-foreground">Pick a church to read the note you sent.</p>
          )}
        </section>
      </main>
    </OperatorShell>
  )
}
