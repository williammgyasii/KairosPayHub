import { useEffect, useMemo, useState } from 'react'
import { ImageIcon, Upload } from 'lucide-react'
import type { ApiClient } from '@/api/core'
import { buildMembersQuery } from '@/api/structure'
import { createContribution, uploadGivingAttachment } from '@/api/giving'
import { SearchPicker } from '@/components/structure/search-picker'
import { WizardField } from '@/components/structure/wizard-shell'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineSpinner } from '@/components/ui/spinner'

interface LogContributionFormProps {
  api: ApiClient
  programId: string
  disabled?: boolean
  onLogged: () => void
}

export function LogContributionForm({
  api,
  programId,
  disabled,
  onLogged,
}: LogContributionFormProps) {
  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [dateSent, setDateSent] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [members, setMembers] = useState<{ id: string; name: string; email: string | null }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{
          items: { id: string; name: string; email: string | null }[]
        }>(`/api/structure/members${buildMembersQuery({ page: 1, pageSize: 100, sortBy: 'name' })}`)
        setMembers(res.items)
      } catch {
        setMembers([])
      }
    })()
  }, [api])

  useEffect(() => {
    if (!receipt) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(receipt)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [receipt])

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        id: m.id,
        label: m.name,
        hint: m.email ?? undefined,
      })),
    [members],
  )

  const canSubmit =
    Boolean(memberId) && Boolean(amount) && Number(amount) > 0 && Boolean(receipt) && Boolean(dateSent)

  async function handleSubmit() {
    if (!receipt || !canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const attachment = await uploadGivingAttachment(receipt)
      await createContribution(api, programId, {
        memberId,
        amount: Number(amount),
        currency: 'GHS',
        dateSent: `${dateSent}T12:00:00.000Z`,
        attachmentKey: attachment.attachmentKey,
        notes: notes.trim() || null,
      })
      setMemberId('')
      setAmount('')
      setNotes('')
      setReceipt(null)
      onLogged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log contribution')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log contribution</CardTitle>
        <CardDescription>
          Select a member, enter the amount, and attach their payment screenshot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <WizardField label="Member" id="log-member" required>
          <SearchPicker
            options={memberOptions}
            value={memberId}
            onChange={setMemberId}
            placeholder="Search members…"
            emptyMessage="No members found."
            required
          />
        </WizardField>

        <div className="grid gap-4 sm:grid-cols-2">
          <WizardField label="Amount (GHS)" id="log-amount" required>
            <Input
              id="log-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              disabled={disabled || busy}
              onChange={(e) => setAmount(e.target.value)}
            />
          </WizardField>
          <WizardField label="Date sent" id="log-date" required>
            <DatePicker
              id="log-date"
              value={dateSent}
              onChange={setDateSent}
              disabled={disabled || busy}
              required
            />
          </WizardField>
        </div>

        <WizardField label="Notes" id="log-notes">
          <Input
            id="log-notes"
            value={notes}
            disabled={disabled || busy}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional reference or comment"
          />
        </WizardField>

        <WizardField label="Payment screenshot" id="log-receipt" required>
          <label
            htmlFor="log-receipt"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 transition-colors hover:bg-muted/20"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-40 rounded-lg object-contain"
              />
            ) : (
              <>
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">JPEG, PNG, or WebP · max 5 MB</span>
              </>
            )}
            <input
              id="log-receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={disabled || busy}
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
          </label>
          {receipt && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5" />
              {receipt.name}
            </p>
          )}
        </WizardField>

        <Button type="button" disabled={disabled || busy || !canSubmit} onClick={() => void handleSubmit()}>
          {busy ? (
            <>
              <InlineSpinner className="mr-2" />
              Submitting…
            </>
          ) : (
            'Submit for approval'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
