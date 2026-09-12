import { useEffect, useState } from 'react'
import { Copy, Link2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/shared/api'
import { joinInviteUrl, type JoinInvite } from '@/api/join'
import { JoinQrCode } from '@/components/structure/join-qr-code'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Modal } from '@/shared/ui/modal'
import { formatApiError } from '@/shared/lib/structure-tree'

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
      title="Add invite"
      description="People open this link or scan the QR, enter their details, and wait for you to accept them."
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="join-duration">Link lasts</Label>
          <select
            id="join-duration"
            className="h-10 w-full rounded-md border border-sky-200 bg-sky-50/60 px-3 text-sm"
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

        <Button
          type="button"
          variant="outline"
          className="w-full border-sky-200 text-sky-800 hover:bg-sky-50"
          onClick={() => void generate()}
          disabled={busy}
        >
          <RefreshCw className="size-4" />
          {invite ? 'Generate new link' : 'Generate link'}
        </Button>
        {invite && (
          <p className="text-center text-xs text-muted-foreground">
            Generating again invalidates the previous link.
          </p>
        )}

        {url && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-5">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-800">
              <Link2 className="size-3.5" />
              Scan to join
            </div>
            <JoinQrCode url={url} />
            <p className="w-full break-all rounded-md bg-white/80 px-3 py-2 text-center text-xs text-sky-950">
              {url}
            </p>
          </div>
        )}

        {url && (
          <Button type="button" className="w-full" onClick={() => void copyLink()}>
            <Copy className="size-4" />
            Copy link
          </Button>
        )}
      </div>
    </Modal>
  )
}
