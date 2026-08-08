import type { GivingProgram } from '@/api/giving'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

export type CampaignConfirmAction = 'close' | 'reopen' | 'delete'

interface GivingCampaignConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: CampaignConfirmAction | null
  program: GivingProgram | null
  busy?: boolean
  onConfirm: () => void
}

const COPY: Record<
  CampaignConfirmAction,
  { title: string; description: (title: string) => string; confirm: string; destructive?: boolean }
> = {
  close: {
    title: 'Close campaign',
    description: (title) =>
      `Close "${title}"? Leaders will no longer be able to log new contributions. Existing records stay visible.`,
    confirm: 'Close campaign',
  },
  reopen: {
    title: 'Reopen campaign',
    description: (title) =>
      `Reopen "${title}" so approved sub-givings can accept contributions again.`,
    confirm: 'Reopen campaign',
  },
  delete: {
    title: 'Delete campaign',
    description: (title) =>
      `Permanently delete "${title}" and its sub-givings? This only works when nothing has been logged yet.`,
    confirm: 'Delete campaign',
    destructive: true,
  },
}

export function GivingCampaignConfirmModal({
  open,
  onOpenChange,
  action,
  program,
  busy,
  onConfirm,
}: GivingCampaignConfirmModalProps) {
  if (!action || !program) return null
  const copy = COPY[action]

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={copy.title} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{copy.description(program.title)}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className={copy.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            disabled={busy}
            onClick={onConfirm}
          >
            {copy.confirm}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
