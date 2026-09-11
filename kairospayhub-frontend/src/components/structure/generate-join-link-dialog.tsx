import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useApi } from '@/api/core'
import { joinInviteUrl, type JoinInvite } from '@/api/join'
import { JoinQrCode } from '@/components/structure/join-qr-code'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { formatApiError } from '@/lib/structure-tree'

const DURATIONS = [
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const

export function GenerateJoinLinkDialog({
  open,
  onOpenChange,
  nodeId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: string
}) {
  const api = useApi()
  const [days, setDays] = useState<1 | 7 | 30>(7)
  const [invite, setInvite] = useState<JoinInvite | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    void api
      .get<JoinInvite>(`/api/structure/nodes/${nodeId}/join-invite`)
      .then(setInvite)
      .catch(() => setInvite(null))
  }, [api, nodeId, open])

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const next = await api.post<JoinInvite>(`/api/structure/nodes/${nodeId}/join-invite`, {
        expiresInDays: days,
      })
      setInvite(next)
      toast.success('Join link ready')
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!invite) return
    await navigator.clipboard.writeText(joinInviteUrl(invite.token))
    toast.success('Link copied')
  }

  const url = invite ? joinInviteUrl(invite.token) : null

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Generate join link"
      description="People open this link or scan the QR, enter their details, and wait for you to accept them."
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="join-duration">Link lasts</Label>
          <select
            id="join-duration"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 1 | 7 | 30)}
          >
            {DURATIONS.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="button" onClick={() => void generate()} disabled={busy}>
          {invite ? 'Generate new link' : 'Generate link'}
        </Button>
        {invite && (
          <p className="text-xs text-muted-foreground">
            Generating again invalidates the previous link.
          </p>
        )}

        {url && (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
            <p className="break-all text-sm">{url}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
                Copy link
              </Button>
              <JoinQrCode url={url} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
