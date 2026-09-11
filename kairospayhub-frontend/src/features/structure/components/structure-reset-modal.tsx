import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'

export function StructureResetModal({
  open,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title="Reset this church’s structure?"
      description="Doing this deletes every unit, every church member, attendance, and giving, then returns you to a blank structure."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">This action cannot be undone.</p>
          <p className="mt-1 text-muted-foreground">
            Your church name, country, and pastor login stay. You can define a new structure afterward.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            loading={busy}
            loadingLabel="Resetting…"
          >
            Delete structure
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function StructureLayerRemoveModal({
  layerName,
  intent,
  busy,
  onConfirmRemove,
  onOfferReset,
  onClose,
}: {
  layerName: string | null
  intent: 'saveWithoutLayer' | 'offerReset' | null
  busy: boolean
  onConfirmRemove: () => void
  onOfferReset: () => void
  onClose: () => void
}) {
  if (!layerName || !intent) return null

  if (intent === 'offerReset') {
    return (
      <Modal
        open
        onOpenChange={(next) => !next && onClose()}
        title={`Cannot remove ${layerName} while units exist`}
        description="Dropping one layer from a live tree is not supported. Delete the whole structure to start over."
      >
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onOfferReset}>
            Delete structure
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Remove ${layerName}?`}
      description={`This drops the ${layerName} layer from the structure definition. Cell stays.`}
    >
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={busy}
          onClick={onConfirmRemove}
          loading={busy}
          loadingLabel="Removing…"
        >
          Remove layer
        </Button>
      </div>
    </Modal>
  )
}
