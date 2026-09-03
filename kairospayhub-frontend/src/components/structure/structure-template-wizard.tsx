import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Layers } from 'lucide-react'
import {
  TEMPLATE_PRESETS,
  type StructureLayerInput,
} from '@/api/structure'
import { useApi } from '@/api/core'
import { StructureChainPreviewDialog } from '@/components/structure/structure-chain-preview-dialog'
import { StructureLayerCanvas } from '@/components/structure/structure-layer-canvas'
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
  onBack?: () => void
  variant?: 'card' | 'embedded'
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
}

export function StructureTemplateWizard({
  churchName,
  initialName,
  initialLayers,
  submitLabel = 'Save structure definition',
  onCancel,
  onBack,
  variant = 'card',
  busy,
  submit,
}: StructureTemplateWizardProps) {
  const api = useApi()
  const embedded = variant === 'embedded'
  const [selectedPreset, setSelectedPreset] = useState(
    initialLayers ? 'custom' : TEMPLATE_PRESETS[0].id,
  )
  const [structureName, setStructureName] = useState(initialName ?? 'Main structure')
  const [layers, setLayers] = useState<StructureLayerInput[]>(
    initialLayers ?? TEMPLATE_PRESETS[0].layers,
  )
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null)
  const [quickPresetsOpen, setQuickPresetsOpen] = useState(!embedded)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyPreset(presetId: string) {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setSelectedPreset(presetId)
    setLayers(preset.layers.map((l) => ({ ...l })))
    setSelectedLayerIndex(null)
  }

  function updateLayer(index: number, patch: Partial<StructureLayerInput>) {
    setSelectedPreset('custom')
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function insertLayerAt(index: number) {
    setSelectedPreset('custom')
    setLayers((prev) => {
      const next = [...prev]
      next.splice(index, 0, { standardType: 'Fellowship', displayName: 'Fellowship' })
      return next
    })
    setSelectedLayerIndex(index)
  }

  function removeLayerAt(index: number) {
    if (layers.length <= 1) return
    const cellIndex = layers.length - 1
    if (index === cellIndex) return
    setSelectedPreset('custom')
    setLayers((prev) => prev.filter((_, i) => i !== index))
    setSelectedLayerIndex((prev) => {
      if (prev === null) return null
      if (prev === index) return null
      if (prev > index) return prev - 1
      return prev
    })
  }

  async function saveTemplate() {
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
  }

  const Wrapper = embedded ? 'div' : 'section'

  return (
    <>
      <Wrapper
        className={cn(
          embedded ? 'w-full text-left' : 'rounded-xl border border-primary/20 bg-primary/5 p-6',
        )}
      >
        <div className={cn('flex items-start gap-3', embedded && 'mb-3 text-left')}>
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
              embedded ? 'size-9' : 'size-10',
            )}
          >
            <Layers className={embedded ? 'size-4' : 'size-5'} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={cn('font-semibold tracking-tight', embedded ? 'text-lg' : 'text-base')}>
              Define your church structure
            </h2>
            <p
              className={cn(
                'leading-snug text-muted-foreground',
                embedded ? 'mt-0.5 text-sm' : 'mt-1 text-sm',
              )}
            >
              Tap <span className="font-medium text-foreground">+</span> between nodes to add a layer.
              Members always sit on the last layer (Cell).
            </p>
          </div>
        </div>

        <div className={embedded ? 'mt-2' : 'mt-4'}>
          <button
            type="button"
            onClick={() => setQuickPresetsOpen((open) => !open)}
            className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/35"
          >
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                quickPresetsOpen && 'rotate-180',
              )}
            />
            Quick presets
            {!quickPresetsOpen && selectedPreset !== 'custom' && (
              <span className="ml-auto truncate text-xs font-normal text-muted-foreground">
                {TEMPLATE_PRESETS.find((p) => p.id === selectedPreset)?.label}
              </span>
            )}
          </button>

          {quickPresetsOpen && (
            <div className={cn('grid gap-2 pt-2', embedded ? 'grid-cols-3' : 'sm:grid-cols-3')}>
              {TEMPLATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition-colors',
                    selectedPreset === preset.id
                      ? 'border-primary/40 bg-background shadow-sm'
                      : 'border-border/60 bg-background/60 hover:bg-background',
                  )}
                >
                  <p className="text-xs font-medium">{preset.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            'rounded-lg border border-border/60 bg-background',
            embedded ? 'mt-3 space-y-3 p-3' : 'mt-4 space-y-4 p-4',
          )}
        >
          <div className="space-y-1">
            <Label className="text-xs">Structure name</Label>
            <Input
              className={cn(
                'w-full sm:max-w-md',
                embedded && 'h-8 text-xs',
              )}
              value={structureName}
              onChange={(e) => setStructureName(e.target.value)}
              placeholder="Main structure"
              required
            />
            <p className="text-[10px] leading-snug text-muted-foreground">
              Label for this hierarchy (e.g. Main structure).
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium">Layer chain</p>
            <StructureLayerCanvas
              churchName={churchName}
              layers={layers}
              selectedIndex={selectedLayerIndex}
              onSelectIndex={setSelectedLayerIndex}
              onChangeLayer={updateLayer}
              onInsertAt={insertLayerAt}
              onRemoveAt={removeLayerAt}
              compact={embedded}
            />
          </div>
        </div>

        {error && (
          <p className={cn('text-sm text-destructive', embedded ? 'mt-3' : 'mt-4')}>{error}</p>
        )}

        {embedded ? (
          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={onBack}
                className="sm:mr-auto"
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            )}
            <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="size-4" />
                Preview
              </Button>
              <Button
                className="sm:min-w-[10rem]"
                disabled={busy}
                onClick={() => void submit(saveTemplate)}
              >
                {submitLabel}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void submit(saveTemplate)}>
              {submitLabel}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              Preview
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </Wrapper>

      <StructureChainPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        churchName={churchName}
        structureName={structureName}
        layers={layers}
      />
    </>
  )
}
