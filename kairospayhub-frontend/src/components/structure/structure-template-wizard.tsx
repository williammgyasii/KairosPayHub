import { useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import {
  LAYER_TYPE_OPTIONS,
  TEMPLATE_PRESETS,
  type StructureLayerInput,
  type StructureLayerType,
} from '@/api/structure'
import { useApi } from '@/api/useApi'
import { StructureChainFromLabels } from '@/components/structure/structure-chain'
import { formatApiError } from '@/lib/structure-tree'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface StructureTemplateWizardProps {
  churchName?: string | null
  initialName?: string
  initialLayers?: StructureLayerInput[]
  submitLabel?: string
  onCancel?: () => void
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
}

export function StructureTemplateWizard({
  churchName,
  initialName,
  initialLayers,
  submitLabel = 'Save structure definition',
  onCancel,
  busy,
  submit,
}: StructureTemplateWizardProps) {
  const api = useApi()
  const [selectedPreset, setSelectedPreset] = useState(
    initialLayers ? 'custom' : TEMPLATE_PRESETS[0].id,
  )
  const [structureName, setStructureName] = useState(initialName ?? 'Main structure')
  const [layers, setLayers] = useState<StructureLayerInput[]>(
    initialLayers ?? TEMPLATE_PRESETS[0].layers,
  )
  const [error, setError] = useState<string | null>(null)

  function applyPreset(presetId: string) {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setSelectedPreset(presetId)
    setLayers(preset.layers.map((l) => ({ ...l })))
  }

  function updateLayer(index: number, patch: Partial<StructureLayerInput>) {
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function addLayer() {
    setSelectedPreset('custom')
    setLayers((prev) => [
      ...prev.slice(0, -1),
      { standardType: 'Fellowship', displayName: 'Fellowship' },
      prev[prev.length - 1] ?? { standardType: 'Cell', displayName: 'Cell' },
    ])
  }

  function removeLayer(index: number) {
    if (layers.length <= 1) return
    setSelectedPreset('custom')
    setLayers((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight">Define your church structure</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {churchName ?? 'Your church'} needs a layer chain before you add people. Members always
            sit on the last org layer (Cell). Pick a preset or customize labels.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {TEMPLATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            className={cn(
              'rounded-lg border px-4 py-3 text-left transition-colors',
              selectedPreset === preset.id
                ? 'border-primary/40 bg-background shadow-sm'
                : 'border-border/60 bg-background/60 hover:bg-background',
            )}
          >
            <p className="text-sm font-medium">{preset.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-border/60 bg-background p-4">
        <div className="space-y-1">
          <Label className="text-xs">Structure name</Label>
          <Input
            value={structureName}
            onChange={(e) => setStructureName(e.target.value)}
            placeholder="Main structure"
            required
          />
          <p className="text-xs text-muted-foreground">
            A label for this hierarchy (e.g. Main structure, Youth ministry).
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-sm font-medium">Your layer chain</p>
        </div>

        <StructureChainFromLabels
          labels={layers.map((layer) => layer.displayName)}
          includeChurch
          className="py-1"
        />

        <div className="space-y-3 pt-2">
          {layers.map((layer, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-border/50 p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">Standard type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={layer.standardType}
                  disabled={index === layers.length - 1}
                  onChange={(e) =>
                    updateLayer(index, {
                      standardType: e.target.value as StructureLayerType,
                      displayName:
                        index === layers.length - 1
                          ? 'Cell'
                          : layer.displayName === 'Cell'
                            ? e.target.value
                            : layer.displayName,
                    })
                  }
                >
                  {LAYER_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type} disabled={index === layers.length - 1 && type !== 'Cell'}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display name</Label>
                <Input
                  value={layer.displayName}
                  onChange={(e) => updateLayer(index, { displayName: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={layers.length <= 1 || index === layers.length - 1}
                  onClick={() => removeLayer(index)}
                  aria-label="Remove layer"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addLayer}>
          <Plus className="size-4" />
          Insert layer before Cell
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() =>
            void submit(async () => {
              setError(null)
              try {
                await api.put('/api/structure/template', {
                  name: structureName.trim(),
                  layers: layers.map((l) => ({
                    standardType: l.standardType,
                    displayName: l.displayName.trim(),
                  })),
                })
              } catch (err) {
                setError(formatApiError(err))
                throw err
              }
            })
          }
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  )
}
