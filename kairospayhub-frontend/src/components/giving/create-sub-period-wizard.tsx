import { useEffect, useMemo, useState } from 'react'
import type { ApiClient } from '@/api/core'
import type { GivingProgram, ProgramScopeKind } from '@/api/giving'
import { createSubPeriod, formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import {
  defaultPeriodLabel,
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

import { nodesBelowScopeRoot } from '@/lib/structure-tree'

type CreateSubPeriodWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  parent: GivingProgram
  api: ApiClient
  tree: StructureTree | null
  onCreated: () => void
  requiresPastorApproval?: boolean
  scopeRootNodeId?: string | null
}

function scopeOptionsForParent(
  parent: GivingProgram,
  allowChurchWide: boolean,
  scopeRootNodeId?: string | null,
): ProgramScopeKind[] {
  if (scopeRootNodeId) {
    if (parent.scopeKind === 'ChurchWide' || parent.scopeKind === 'PFCC') {
      return ['Fellowship', 'FellowshipGroup']
    }
    if (parent.scopeKind === 'Fellowship') return ['Fellowship', 'FellowshipGroup']
    return ['FellowshipGroup']
  }

  if (parent.scopeKind === 'ChurchWide') {
    const options: ProgramScopeKind[] = ['PFCC', 'Fellowship', 'FellowshipGroup']
    return allowChurchWide ? ['ChurchWide', ...options] : options
  }
  if (parent.scopeKind === 'PFCC') return ['PFCC', 'Fellowship', 'FellowshipGroup']
  if (parent.scopeKind === 'Fellowship') return ['Fellowship', 'FellowshipGroup']
  return ['FellowshipGroup']
}

export function CreateSubPeriodWizard({
  open,
  onOpenChange,
  parent,
  api,
  tree,
  onCreated,
  requiresPastorApproval = false,
  scopeRootNodeId = null,
}: CreateSubPeriodWizardProps) {
  const scopeOptions = useMemo(
    () => scopeOptionsForParent(parent, !requiresPastorApproval, scopeRootNodeId),
    [parent.scopeKind, parent.id, requiresPastorApproval, scopeRootNodeId],
  )
  const defaultScopeKind = scopeOptions[0]
  const steps = ['Details', 'Scope', 'Review'] as const

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [periodLabel, setPeriodLabel] = useState(defaultPeriodLabel())
  const [scopeKind, setScopeKind] = useState<ProgramScopeKind>(defaultScopeKind)
  const [scopeNodeId, setScopeNodeId] = useState('')
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([])
  const [moveParentContributions, setMoveParentContributions] = useState(false)

  const parentDirectCount = parent.directContributionCount ?? 0
  const parentDirectTotal = parent.directContributionTotalAmount ?? 0

  useEffect(() => {
    if (!open) return
    setMoveParentContributions(parentDirectCount > 0)
  }, [open, parent.id, parentDirectCount])

  const scopeNodes = useMemo(() => {
    if (!tree) return []
    const nodes = nodesForScopeKind(tree, scopeKind)
    if (!scopeRootNodeId) return nodes
    return nodesBelowScopeRoot(tree, nodes, scopeRootNodeId)
  }, [tree, scopeKind, scopeRootNodeId])

  const scopePickerOptions = useMemo(
    () =>
      scopeNodes.map((node) => ({
        id: node.id,
        label: node.name,
        hint: tree ? nodePathLabel(tree, node.id, scopeRootNodeId) : undefined,
      })),
    [scopeNodes, tree, scopeRootNodeId],
  )

  const canProceed = useMemo(() => {
    if (step === 0) return title.trim().length > 0 && periodLabel.trim().length > 0
    if (step === 1) {
      if (scopeKind === 'ChurchWide') return true
      if (scopeKind === 'FellowshipGroup') return scopeNodeIds.length > 0
      if (scopeKind === 'Fellowship' || scopeKind === 'PFCC') return Boolean(scopeNodeId)
    }
    return true
  }, [step, title, periodLabel, scopeKind, scopeNodeId, scopeNodeIds])

  function go(next: number) {
    setDirection(next > step ? 'forward' : 'back')
    setStep(next)
  }

  function toggleGroupNode(id: string) {
    setScopeNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      await createSubPeriod(api, {
        parentProgramId: parent.id,
        title: title.trim(),
        periodLabel: periodLabel.trim(),
        scopeKind,
        scopeNodeId:
          scopeKind === 'Fellowship' || scopeKind === 'PFCC' ? scopeNodeId || null : null,
        scopeNodeIds: scopeKind === 'FellowshipGroup' ? scopeNodeIds : undefined,
        moveParentContributions: parentDirectCount > 0 ? moveParentContributions : undefined,
      })
      onOpenChange(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create sub-giving')
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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add sub-giving"
      description={
        requiresPastorApproval
          ? 'Your sub-giving will be sent to the pastor for approval before contributions can be logged.'
          : 'Cell leaders log contributions on sub givings, not the parent campaign.'
      }
      size="lg"
    >
      <div className="space-y-5">
        <WizardStepper steps={[...steps]} currentStep={step} />
        <WizardProgressBar value={((step + 1) / steps.length) * 100} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <WizardStepPanel stepKey={step} direction={direction}>
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Under <strong className="text-foreground">{parent.title}</strong>
              </p>
              <WizardField label="Title" id="sub-title" required>
                <Input
                  id="sub-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="January 2026"
                />
              </WizardField>
              <WizardField label="Period label" id="sub-period" required>
                <Input
                  id="sub-period"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </WizardField>
              {parentDirectCount > 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-sm text-muted-foreground">
                  <p>
                    This campaign already has{' '}
                    <strong className="text-foreground">
                      {parentDirectCount} contribution{parentDirectCount === 1 ? '' : 's'}
                    </strong>{' '}
                    logged directly on it ({formatAmount(parentDirectTotal)}). After you add a
                    sub-giving, new payments go there — you can move the existing ones on the final
                    step.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
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

              {!tree ? (
                <p className="text-sm text-muted-foreground">
                  Load your structure first to pick a scope node.
                </p>
              ) : scopeKind === 'ChurchWide' ? (
                <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Same scope as the parent campaign (church-wide).
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
                              {nodePathLabel(tree, node.id, scopeRootNodeId)}
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
                <dt className="text-muted-foreground">Parent</dt>
                <dd className="font-medium">{parent.title}</dd>
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
                  {scopeKind === 'FellowshipGroup'
                    ? `${scopeNodeIds.length} fellowships`
                    : scopeKindLabel(scopeKind)}
                </dd>
              </div>
              {parentDirectCount > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={moveParentContributions}
                      onChange={(e) => setMoveParentContributions(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-foreground">
                        Move {parentDirectCount} existing contribution
                        {parentDirectCount === 1 ? '' : 's'} ({formatAmount(parentDirectTotal)})
                        into {title.trim() || 'this sub-giving'}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Recommended so all giving for this campaign lives under sub-givings.
                      </span>
                    </span>
                  </label>
                </div>
              )}
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
          submitLabel={requiresPastorApproval ? 'Submit for approval' : 'Create sub-giving'}
        />
      </div>
    </Modal>
  )
}
