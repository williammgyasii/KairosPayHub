import type { StructureMemberRow } from '@/lib/structure-table-rows'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export function MemberDeleteModal({
  member,
  busy,
  onConfirm,
  onClose,
}: {
  member: StructureMemberRow | null
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!member) return null

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Remove ${member.member}?`}
      description="This permanently removes the member from your roster."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">This action cannot be undone.</p>
          <p className="mt-1 text-muted-foreground">
            Members with giving contributions cannot be removed — keep those records for audit history.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            loading={busy}
            loadingLabel="Removing…"
          >
            Remove member
          </Button>
        </div>
      </div>
    </Modal>
  )
}
