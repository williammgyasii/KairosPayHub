import { useMemo, useState } from 'react'
import { Layers, Plus } from 'lucide-react'
import {
  LAYER_TYPE_OPTIONS,
  type EvolveStructureTemplateResponse,
  type StructureLayerInput,
  type StructureLayerType,
  type StructureTree,
} from '@/api/structure'
import { useApi } from '@/api/core'
import { StructureChainFromLabels } from '@/components/structure/structure-chain'
import {
  WizardField,
  WizardFooter,
  WizardIntro,
  WizardProgressBar,
  WizardStepPanel,
  WizardStepper,
} from '@/components/structure/wizard-shell'
import { getLayers } from '@/lib/structure-tree'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

export type StructureEvolveMode = 'rename' | 'appendTop' | 'insertAt' | 'appendBeforeMember'

const INSERT_STEPS = ['Placement', 'New layer', 'Preview'] as const
const APPEND_STEPS = ['New layer', 'Preview'] as const
const RENAME_STEPS = ['Labels', 'Preview'] as const

export function StructureEvolveWizard({
  tree,
  mode,
  busy,
  submit,
  onClose,
}: {
  tree: StructureTree
  mode: StructureEvolveMode
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
}) {
  const api = useApi()
  const layers = getLayers(tree)
  const isRename = mode === 'rename'
  const isAppendBeforeMember = mode === 'appendBeforeMember'
  const deepest = layers[layers.length - 1]

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [structureName, setStructureName] = useState(tree.template?.name ?? 'Main structure')
  const [renameLayers, setRenameLayers] = useState<StructureLayerInput[]>(
    layers.map((layer) => ({
      standardType: layer.standardType,
      displayName: layer.displayName,
    })),
  )
  const [insertAt, setInsertAt] = useState(mode === 'appendTop' ? 0 : Math.max(1, layers.length - 1))
  const [newLayer, setNewLayer] = useState<StructureLayerInput>(() => ({
    standardType: mode === 'appendBeforeMember' ? 'Cell' : 'Group',
    displayName: mode === 'appendBeforeMember' ? 'Member unit' : 'Zone',
  }))
  const [preview, setPreview] = useState<EvolveStructureTemplateResponse['preview'] | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)

  const stepLabels = isRename
    ? RENAME_STEPS
    : mode === 'appendTop' || isAppendBeforeMember
      ? APPEND_STEPS
      : INSERT_STEPS
  const totalSteps = stepLabels.length
  const progress = ((step + 1) / totalSteps) * 100

  const layerStepIndex = isRename ? -1 : mode === 'appendTop' || isAppendBeforeMember ? 0 : 1
  const previewStepIndex = totalSteps - 1

  const insertOptions = useMemo(() => {
    const options: { sortOrder: number; label: string }[] = [
      { sortOrder: 0, label: `On top (before ${layers[0]?.displayName ?? 'first layer'})` },
    ]
    for (let index = 1; index < layers.length; index += 1) {
      const isBeforeDeepest = index === layers.length - 1
      options.push({
        sortOrder: index,
        label: isBeforeDeepest
          ? `Between ${layers[index - 1].displayName} and ${layers[index].displayName} (org layer)`
          : `Between ${layers[index - 1].displayName} and ${layers[index].displayName}`,
      })
    }
    return options
  }, [layers])

  const proposedChain = useMemo(() => {
    if (isRename) {
      return renameLayers.map((layer) => layer.displayName)
    }
    if (isAppendBeforeMember) {
      return [...layers.map((layer) => layer.displayName), newLayer.displayName]
    }
    const parts: string[] = []
    const at = mode === 'appendTop' ? 0 : insertAt
    for (let index = 0; index < at; index += 1) parts.push(layers[index].displayName)
    parts.push(newLayer.displayName)
    for (let index = at; index < layers.length; index += 1) parts.push(layers[index].displayName)
    return parts
  }, [isRename, isAppendBeforeMember, renameLayers, mode, insertAt, newLayer, layers])

  function evolveOperation() {
    if (isRename) return 'rename'
    if (mode === 'appendTop') return 'appendTop'
    if (isAppendBeforeMember) return 'appendBeforeMember'
    return 'insertAt'
  }

  async function loadPreview() {
    setPreviewBusy(true)
    try {
      const response = await api.post<EvolveStructureTemplateResponse>('/api/structure/template/evolve', {
        operation: evolveOperation(),
        name: structureName,
        layer: isRename ? undefined : newLayer,
        atSortOrder: mode === 'insertAt' ? insertAt : mode === 'appendTop' ? 0 : undefined,
        layers: isRename ? renameLayers : undefined,
        dryRun: true,
      })
      setPreview(response.preview)
      return response
    } finally {
      setPreviewBusy(false)
    }
  }

  const canNextRename = renameLayers.every((layer) => layer.displayName.trim().length > 0)
  const canNextLayer = newLayer.displayName.trim().length > 0

  const canProceed =
    step === previewStepIndex
      ? Boolean(preview)
      : isRename && step === 0
        ? canNextRename
        : !isRename && step === layerStepIndex
          ? canNextLayer
          : true

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={isRename ? 'Rename structure labels' : isAppendBeforeMember ? 'Add layer before members' : 'Add org layer'}
      description={
        isRename
          ? 'Update display names only. Roster units and members stay where they are.'
          : isAppendBeforeMember
            ? `Add a new member-placement layer after ${deepest?.displayName ?? 'your deepest layer'}. People move to the new deepest step automatically.`
            : 'Extend your one-way chain. Existing units are re-linked automatically.'
      }
      size="xl"
    >
      <div className="space-y-5">
        <StructureChainFromLabels
          labels={proposedChain}
          includeChurch
          className="justify-center py-1"
        />

        <WizardStepper steps={stepLabels} currentStep={step} />
        <WizardProgressBar value={progress} />

        <WizardStepPanel stepKey={`${mode}-${step}`} direction={direction}>
          {isRename && step === 0 && (
            <>
              <WizardIntro
                icon={Layers}
                title="Structure labels"
                description="Standard types and order stay fixed. Only names shown in Roster and wizards change."
              />
              <WizardField label="Structure name" id="evolve-name">
                <Input
                  id="evolve-name"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                />
              </WizardField>
              <div className="space-y-3">
                {renameLayers.map((layer, index) => (
                  <div key={layers[index].id} className="grid gap-3 sm:grid-cols-2">
                    <WizardField label="Standard type" id={`type-${index}`}>
                      <Input id={`type-${index}`} value={layer.standardType} readOnly className="bg-muted/40" />
                    </WizardField>
                    <WizardField label="Display name" id={`label-${index}`}>
                      <Input
                        id={`label-${index}`}
                        value={layer.displayName}
                        onChange={(e) =>
                          setRenameLayers((current) =>
                            current.map((entry, i) =>
                              i === index ? { ...entry, displayName: e.target.value } : entry,
                            ),
                          )
                        }
                        required
                      />
                    </WizardField>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isRename && step === 0 && mode === 'insertAt' && (
            <>
              <WizardIntro
                icon={Plus}
                title="Where should the new layer sit?"
                description="Structure flows one way: Church down to members. Pick the gap to insert into."
              />
              <div className="space-y-2">
                {insertOptions.map((option) => (
                  <button
                    key={option.sortOrder}
                    type="button"
                    className={cn(
                      'flex w-full items-center rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                      insertAt === option.sortOrder
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border/60 hover:bg-accent/40',
                    )}
                    onClick={() => setInsertAt(option.sortOrder)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {!isRename && step === layerStepIndex && (
            <>
              <WizardIntro
                icon={Layers}
                title={isAppendBeforeMember ? 'New member-placement layer' : 'New layer details'}
                description={
                  isAppendBeforeMember
                    ? `Members will attach to ${newLayer.displayName} under each ${deepest?.displayName ?? 'unit'}. See the chain above for the full structure after this change.`
                    : 'See the chain above for the full structure after this change.'
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <WizardField label="Standard type" id="new-layer-type">
                  {isAppendBeforeMember ? (
                    <Input id="new-layer-type" value="Cell" readOnly className="bg-muted/40" />
                  ) : (
                    <select
                      id="new-layer-type"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={newLayer.standardType}
                      onChange={(e) =>
                        setNewLayer((current) => ({
                          ...current,
                          standardType: e.target.value as StructureLayerType,
                        }))
                      }
                    >
                      {LAYER_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  )}
                </WizardField>
                <WizardField label="Display name" id="new-layer-name" required>
                  <Input
                    id="new-layer-name"
                    value={newLayer.displayName}
                    onChange={(e) =>
                      setNewLayer((current) => ({ ...current, displayName: e.target.value }))
                    }
                    required
                    autoFocus
                  />
                </WizardField>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAppendBeforeMember
                  ? 'The deepest org layer must stay Cell so members have a placement layer.'
                  : 'The deepest layer must remain Cell so members have a placement layer.'}
              </p>
            </>
          )}

          {step === previewStepIndex && preview && (
            <>
              <WizardIntro
                icon={Layers}
                title="Migration preview"
                description={preview.summary}
              />
              <ul className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4 text-sm">
                {preview.details.map((detail) => (
                  <li key={detail} className="text-muted-foreground">
                    {detail}
                  </li>
                ))}
                {preview.details.length === 0 && (
                  <li className="text-muted-foreground">No structural changes to roster nodes.</li>
                )}
              </ul>
              <p className="text-xs text-muted-foreground">
                Bridge nodes created: {preview.bridgeNodesCreated} · Nodes re-parented:{' '}
                {preview.nodesReparented} · Members moved: {preview.membersMoved}
              </p>
            </>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy || previewBusy}
          isLastStep={step === totalSteps - 1}
          canProceed={canProceed}
          submitLabel="Apply changes"
          onCancel={onClose}
          onBack={() => {
            setDirection('back')
            setStep((current) => current - 1)
          }}
          onNext={() => {
            if (step === totalSteps - 1) {
              void submit(async () => {
                await api.post<EvolveStructureTemplateResponse>('/api/structure/template/evolve', {
                  operation: evolveOperation(),
                  name: structureName,
                  layer: isRename ? undefined : newLayer,
                  atSortOrder: mode === 'insertAt' ? insertAt : mode === 'appendTop' ? 0 : undefined,
                  layers: isRename ? renameLayers : undefined,
                  dryRun: false,
                })
                onClose()
              })
              return
            }

            void (async () => {
              if ((isRename && step === 0) || (!isRename && step === layerStepIndex)) {
                setDirection('forward')
                await loadPreview()
                setStep((current) => current + 1)
                return
              }
              setDirection('forward')
              setStep((current) => current + 1)
            })()
          }}
        />
      </div>
    </Modal>
  )
}
