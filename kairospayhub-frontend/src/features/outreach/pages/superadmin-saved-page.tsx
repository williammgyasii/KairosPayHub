import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { operatorGet, operatorPatch, operatorPost } from '@/features/outreach/lib/operator-session'
import { OperatorShell } from '@/features/outreach/components/operator-shell'
import { MessagePanel } from '@/features/outreach/components/message-panel'
import { SearchLeadsTable, type SearchLead } from '@/features/outreach/components/search-leads-table'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { InlineSpinner } from '@/shared/ui/spinner'

type SavedPageResult = {
  churches: SearchLead[]
  totalCount: number
  page: number
  pageSize: number
}

export function SuperadminSavedPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<SearchLead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [openLead, setOpenLead] = useState<SearchLead | null>(null)
  const [draftLead, setDraftLead] = useState<SearchLead | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendKey, setSendKey] = useState('')
  const [instruction, setInstruction] = useState('')

  async function openMessage(lead: SearchLead) {
    setDraftLead(lead)
    setSubject('')
    setMessage('')
    setNotice('')
    setSent(false)
    setSending(false)
    setSendKey(crypto.randomUUID())
    setInstruction('')
    setDrafting(true)
    try {
      const draft = await operatorPost<{ subject: string; body: string }>(
        `/api/outreach/churches/${lead.id}/draft`,
        {},
      )
      setSubject(draft.subject)
      setMessage(draft.body)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'A draft could not be written.')
    } finally {
      setDrafting(false)
    }
  }

  function applyStatus(id: string, status: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
    setOpenLead((current) => (current && current.id === id ? { ...current, status } : current))
  }

  async function revise() {
    if (!draftLead || instruction.trim().length === 0) return
    setNotice('')
    setDrafting(true)
    try {
      const draft = await operatorPost<{ subject: string; body: string }>(
        `/api/outreach/churches/${draftLead.id}/draft`,
        { instruction, subject, body: message },
      )
      setSubject(draft.subject)
      setMessage(draft.body)
      setInstruction('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'A draft could not be written.')
    } finally {
      setDrafting(false)
    }
  }

  async function reachOut() {
    if (!draftLead || sending || sent) return
    setNotice('')
    setSending(true)
    try {
      const result = await operatorPost<{ sentAt?: string }>(
        `/api/outreach/churches/${draftLead.id}/messages`,
        { subject, body: message },
        { idempotencyKey: sendKey },
      )
      const sentAt = result?.sentAt ?? new Date().toISOString()
      const reached = { sentAt, sentSubject: subject, sentBody: message }
      setRows((current) => current.map((row) => (row.id === draftLead.id ? { ...row, ...reached } : row)))
      setOpenLead((current) => (current && current.id === draftLead.id ? { ...current, ...reached } : current))
      setSent(true)
      toast.success(`Sent to ${draftLead.email}. A reply comes back to your inbox.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The email could not be sent.')
    } finally {
      setSending(false)
    }
  }

  async function mark(status: 'Success' | 'Failure' | 'Converted') {
    if (!openLead) return
    await operatorPatch(`/api/outreach/churches/${openLead.id}`, { status })
    applyStatus(openLead.id, status)
  }

  useEffect(() => {
    let cancelled = false
    operatorGet<SavedPageResult>(`/api/outreach/churches?saved=true&page=${page}&pageSize=${pageSize}`)
      .then((result) => {
        if (cancelled) return
        setRows(result.churches.map((church) => ({ ...church, saved: true })))
        setTotalCount(result.totalCount)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [page, pageSize])

  return (
    <OperatorShell>
      <main>
        <h1 className="text-page-title">Saved leads</h1>
        <p className="mt-2 text-sm text-muted-foreground">Churches you kept from a search.</p>
        <div className="mt-6">
          <SearchLeadsTable
            rows={rows}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
            onOpen={setOpenLead}
            onMessage={(lead) => void openMessage(lead)}
            showStatus
          />
        </div>
        <Modal open={openLead !== null} onOpenChange={(open) => !open && setOpenLead(null)} title={openLead?.name ?? 'Lead'}>
          {openLead ? (
            <>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{openLead.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">State</dt>
                <dd>{openLead.state || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">City</dt>
                <dd>{openLead.city || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reached</dt>
                <dd>{openLead.sentAt ? 'Yes' : 'Not yet'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Outcome</dt>
                <dd>{openLead.status || 'Scouted'}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void mark('Success')}>
                Success
              </Button>
              <Button type="button" variant="outline" onClick={() => void mark('Failure')}>
                Failure
              </Button>
              <Button type="button" variant="outline" onClick={() => void mark('Converted')}>
                Converted
              </Button>
            </div>
            </>
          ) : null}
        </Modal>
        <MessagePanel
          open={draftLead !== null}
          onOpenChange={(open) => !open && setDraftLead(null)}
          title={draftLead ? `Message ${draftLead.name}` : 'Message'}
        >
          {draftLead ? (
            <div className="flex h-full flex-col gap-4">
              <form
                className="flex min-h-0 flex-1 flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void reachOut()
                }}
              >
                <div data-testid="recipient" className="flex items-center gap-2 text-sm">
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">To</Badge>
                  <Badge className="min-w-0 truncate border-violet-200 bg-violet-50 text-violet-700">{draftLead.email}</Badge>
                </div>
                <label className="block text-sm">
                  Subject
                  <input
                    aria-label="Subject"
                    className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </label>
                <label className="flex min-h-0 flex-1 flex-col text-sm">
                  Message
                  <textarea
                    aria-label="Message"
                    className="mt-1 min-h-64 w-full flex-1 rounded-xl border border-input bg-background px-3 py-3 text-sm"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={drafting ? 'Writing a draft…' : ''}
                  />
                </label>
                <Button type="submit" disabled={drafting || sending || sent || message.trim().length === 0}>
                  <AnimatePresence mode="wait" initial={false}>
                    {sending ? (
                      <motion.span
                        key="sending"
                        className="inline-flex items-center gap-2"
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                      >
                        <InlineSpinner />
                        Sending…
                      </motion.span>
                    ) : sent ? (
                      <motion.span
                        key="sent"
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                      >
                        Sent
                      </motion.span>
                    ) : (
                      <motion.span
                        key="reach"
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                      >
                        Reach out
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </form>
              <div className="flex gap-2">
                <input
                  aria-label="Revise"
                  className="h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-sm"
                  placeholder="Ask for a change, like make it shorter"
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    void revise()
                  }}
                />
                <Button type="button" variant="outline" disabled={drafting || instruction.trim().length === 0} onClick={() => void revise()}>
                  Revise
                </Button>
              </div>
              {notice ? <p className="text-sm">{notice}</p> : null}
            </div>
          ) : null}
        </MessagePanel>
      </main>
    </OperatorShell>
  )
}
