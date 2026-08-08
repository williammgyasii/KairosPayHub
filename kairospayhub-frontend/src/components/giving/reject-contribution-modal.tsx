import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RejectContributionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  busy?: boolean
  onConfirm: (reason: string | null) => void
}

export function RejectContributionModal({
  open,
  onOpenChange,
  memberName,
  busy,
  onConfirm,
}: RejectContributionModalProps) {
  const [reason, setReason] = useState('')

  function handleClose(next: boolean) {
    if (!next) setReason('')
    onOpenChange(next)
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Reject contribution"
      description={`Reject ${memberName}'s submission? They can resubmit after fixing the issue.`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reject-reason">Reason (optional)</Label>
          <Input
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Screenshot unclear, wrong amount"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={busy}
            onClick={() => {
              onConfirm(reason.trim() || null)
              setReason('')
            }}
          >
            {busy ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
