import { useEffect, useState } from 'react'
import {
  LAYER_TYPE_OPTIONS,
  type StructureLayerInput,
  type StructureLayerType,
} from '@/api/structure'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface StructureLayerEditModalProps {
  open: boolean
  onClose: () => void
  structureName: string
  layer: StructureLayerInput | null
  layerIndex: number | null
  isCellLayer: boolean
  busy: boolean
  onSave: (payload: { structureName: string; layer: StructureLayerInput | null }) => Promise<void>
}

export function StructureLayerEditModal({
  open,
  onClose,
  structureName,
  layer,
  layerIndex,
  isCellLayer,
  busy,
  onSave,
}: StructureLayerEditModalProps) {
  const [name, setName] = useState(structureName)
  const [draft, setDraft] = useState<StructureLayerInput | null>(layer)

  useEffect(() => {
    if (!open) return
    setName(structureName)
    setDraft(layer)
  }, [open, structureName, layer])

  const editingLayer = layerIndex !== null && draft

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={editingLayer ? `Edit ${draft?.displayName ?? 'layer'}` : 'Structure name'}
      description={
        editingLayer
          ? 'Update how this layer appears across KairosPayHub.'
          : 'Label for this hierarchy (e.g. Main structure).'
      }
      size="md"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void onSave({ structureName: name.trim(), layer: draft }).then(onClose)
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="structure-name">Structure name</Label>
          <Input
            id="structure-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {editingLayer && draft && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="layer-type">Standard type</Label>
              <select
                id="layer-type"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.standardType}
                disabled={isCellLayer}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    standardType: e.target.value as StructureLayerType,
                  })
                }
              >
                {LAYER_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type} disabled={isCellLayer && type !== 'Cell'}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="layer-display">Display name</Label>
              <Input
                id="layer-display"
                value={draft.displayName}
                onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                required
                autoFocus
              />
            </div>
            {isCellLayer && (
              <p className="text-xs text-muted-foreground">
                The deepest org layer stays Cell so members have a placement layer.
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
