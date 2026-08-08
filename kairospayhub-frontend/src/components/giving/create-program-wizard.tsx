import { useEffect, useMemo, useState } from 'react'
import type { Me } from '@/api/me'
import type { GivingType, ProgramScopeKind } from '@/api/giving'
import { createProgram } from '@/api/giving'
import type { ApiClient } from '@/api/client'
import type { StructureTree } from '@/api/structure'
import {
  defaultPeriodLabel,
  defaultProgramTitle,
  GIVING_TYPE_OPTIONS,
  nodePathLabel,
  nodesForScopeKind,
  scopeKindLabel,
} from '@/lib/giving-ui'
import { SearchPicker } from '@/components/structure/search-picker'
import {
  WizardField,
  WizardFooter,
  WizardProgressBar,
  WizardStepPanel,
  WizardStepper,
} from '@/components/structure/wizard-shell'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type CreateProgramWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  me: Me & { onboarded: true }
  api: ApiClient
  tree: StructureTree | null
  onCreated: () => void
}

function scopeOptionsForRole(
  role: (Me & { onboarded: true })['role'],
): ProgramScopeKind[] {
  if (role === 'Pastor') return ['ChurchWide']
  if (role === 'FellowshipLeader') return ['Fellowship', 'FellowshipGroup']
  if (role === 'PFCCManager') return ['PFCC']
  return []
}

export function CreateProgramWizard({
  open,
  onOpenChange,
  me,
  api,
  tree,
  onCreated,
}: CreateProgramWizardProps) {
  const scopeOptions = scopeOptionsForRole(me.role)
  const isPastor = me.role === 'Pastor'
  const steps = isPastor
    ? (['Giving type', 'Details', 'Review'] as const)
    : (['Giving type', 'Details', 'Scope', 'Review'] as const)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [givingType, setGivingType] = useState<GivingType>('Rhapsody')
  const [title, setTitle] = useState(defaultProgramTitle('Rhapsody'))
  const [periodLabel, setPeriodLabel] = useState(defaultPeriodLabel())
  const [scopeKind, setScopeKind] = useState<ProgramScopeKind>(
    scopeOptions[0] ?? 'ChurchWide',
  )
  const [scopeNodeId, setScopeNodeId] = useState('')
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setStep(0)
    setDirection('forward')
    setError(null)
    setGivingType('Rhapsody')
    setTitle(defaultProgramTitle('Rhapsody'))
    setPeriodLabel(defaultPeriodLabel())
    setScopeKind(scopeOptions[0] ?? 'ChurchWide')
    setScopeNodeId('')
    setScopeNodeIds([])
  }, [open, scopeOptions])

  useEffect(() => {
    setTitle(defaultProgramTitle(givingType))
  }, [givingType])

  const scopeNodes = useMemo(
    () => (tree && !isPastor ? nodesForScopeKind(tree, scopeKind) : []),
    [tree, scopeKind, isPastor],
  )

  const scopePickerOptions = useMemo(
    () =>
      scopeNodes.map((node) => ({
        id: node.id,
        label: node.name,
        hint: tree ? nodePathLabel(tree, node.id) : undefined,
      })),
    [scopeNodes, tree],
  )

  const canProceed = useMemo(() => {
    if (step === 0) return Boolean(givingType)
    if (step === 1) return title.trim().length > 0 && periodLabel.trim().length > 0
    if (!isPastor && step === 2) {
      if (scopeKind === 'FellowshipGroup') return scopeNodeIds.length > 0
      if (scopeKind === 'Fellowship' || scopeKind === 'PFCC') return Boolean(scopeNodeId)
    }
    return true
  }, [step, givingType, title, periodLabel, isPastor, scopeKind, scopeNodeId, scopeNodeIds])

  function go(next: number) {
    setDirection(next > step ? 'forward' : 'back')
    setStep(next)
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      await createProgram(api, {
        givingType,
        title: title.trim(),
        periodLabel: periodLabel.trim(),
        scopeKind: isPastor ? 'ChurchWide' : scopeKind,
        scopeNodeId:
          !isPastor && scopeKind !== 'FellowshipGroup' ? scopeNodeId || null : null,
        scopeNodeIds:
          !isPastor && scopeKind === 'FellowshipGroup' ? scopeNodeIds : undefined,
      })
      onOpenChange(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create giving')
    } finally {
      setBusy(false)
    }
  }

  function handleNext() {
    if (step < steps.length - 1) {
      go(step + 1)
      return
    }
    void handleSubmit()
  }

  function toggleGroupNode(id: string) {
    setScopeNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create giving"
      description="Open a campaign so cell leaders can log payments with screenshots."
      size="lg"
    >
      <div className="space-y-5">
        <WizardStepper steps={[...steps]} currentStep={step} />
        <WizardProgressBar value={((step + 1) / steps.length) * 100} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <WizardStepPanel stepKey={step} direction={direction}>
          {step === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {GIVING_TYPE_OPTIONS.map((option) => {
                const active = givingType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                        : 'border-border/60 hover:bg-muted/40',
                    )}
                    onClick={() => setGivingType(option.value)}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </button>
                )
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <WizardField label="Title" id="wizard-title" required>
                <Input
                  id="wizard-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </WizardField>
              <WizardField label="Period label" id="wizard-period" required>
                <Input
                  id="wizard-period"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="e.g. 2026 or January 2026"
                />
              </WizardField>
              {isPastor && (
                <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  This will be church-wide — visible to all leaders in your structure.
                </p>
              )}
            </div>
          )}

          {!isPastor && step === 2 && (
            <div className="space-y-4">
              {scopeOptions.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {scopeOptions.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        scopeKind === kind
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/40',
                      )}
                      onClick={() => {
                        setScopeKind(kind)
                        setScopeNodeId('')
                        setScopeNodeIds([])
                      }}
                    >
                      {scopeKindLabel(kind)}
                    </button>
                  ))}
                </div>
              )}

              {!tree ? (
                <p className="text-sm text-muted-foreground">
                  Load your structure first to pick a scope node.
                </p>
              ) : scopeKind === 'FellowshipGroup' ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Select fellowships</p>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-border/60">
                    {scopeNodes.map((node) => {
                      const checked = scopeNodeIds.includes(node.id)
                      return (
                        <label
                          key={node.id}
                          className="flex cursor-pointer items-start gap-3 border-b border-border/40 px-3 py-2.5 last:border-0 hover:bg-muted/30"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGroupNode(node.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-medium">{node.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {nodePathLabel(tree, node.id)}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <SearchPicker
                  options={scopePickerOptions}
                  value={scopeNodeId}
                  onChange={setScopeNodeId}
                  placeholder="Search units…"
                  emptyMessage="No units at this layer."
                  required
                />
              )}
            </div>
          )}

          {step === steps.length - 1 && (
            <dl className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">{givingType}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium">{title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Period</dt>
                <dd className="font-medium">{periodLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Scope</dt>
                <dd className="text-right font-medium">
                  {isPastor
                    ? 'Church-wide'
                    : scopeKind === 'FellowshipGroup'
                      ? `${scopeNodeIds.length} fellowships`
                      : scopeKindLabel(scopeKind)}
                </dd>
              </div>
            </dl>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          onCancel={() => onOpenChange(false)}
          onBack={() => go(step - 1)}
          onNext={handleNext}
          isLastStep={step === steps.length - 1}
          canProceed={canProceed}
          submitLabel="Create giving"
        />
      </div>
    </Modal>
  )
}
