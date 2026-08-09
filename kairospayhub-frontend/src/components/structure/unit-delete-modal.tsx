import type { UnitDeleteImpact } from '@/lib/structure-tree'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export function UnitDeleteModal({
  impact,
  busy,
  onConfirm,
  onClose,
}: {
  impact: UnitDeleteImpact | null
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!impact) return null

  const hasChildren = impact.childUnits.length > 0 || impact.memberCount > 0

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Delete ${impact.layerName}?`}
      description={`This permanently removes ${impact.unitName} and everything under it.`}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">This action cannot be undone.</p>
          {hasChildren ? (
            <p className="mt-1 text-muted-foreground">
              Deleting this {impact.layerName.toLowerCase()} will also remove:
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              No child units or members are under this {impact.layerName.toLowerCase()}.
            </p>
          )}
        </div>

        {hasChildren && (
          <ul className="space-y-2 text-sm">
            {impact.childUnits.map((entry) => (
              <li key={entry.layerName} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{entry.layerName}</span>
                <span className="font-medium tabular-nums">
                  {entry.count} {entry.layerName.toLowerCase()}
                  {entry.count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
            {impact.memberCount > 0 && (
              <li className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Members</span>
                <span className="font-medium tabular-nums">
                  {impact.memberCount} member{impact.memberCount === 1 ? '' : 's'}
                </span>
              </li>
            )}
          </ul>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            loading={busy}
            loadingLabel="Deleting…"
          >
            Delete {impact.layerName.toLowerCase()}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
