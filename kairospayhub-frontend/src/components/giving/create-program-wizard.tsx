import { useMemo, useState } from 'react'
import type { Me } from '@/api/auth'
import { canManageChurch } from '@/api/auth'
import type { GivingType, ProgramScopeKind } from '@/api/giving'
import { createProgram } from '@/api/giving'
import type { ApiClient } from '@/api/core'
import type { StructureTree } from '@/api/structure'
import {
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
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import {
  defaultCampaignEndDate,
  validateCampaignDates,
} from '@/lib/campaign-date-validation'
import { nodesBelowScopeRoot } from '@/lib/structure-tree'

type CreateProgramWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  me: Me & { onboarded: true }
  api: ApiClient
  tree: StructureTree | null
  onCreated: () => void
}

const SCOPE_OPTIONS = {
  pastor: ['ChurchWide'] as const,
  fellowshipLeader: ['Fellowship', 'FellowshipGroup'] as const,
  pfccManager: ['PFCC'] as const,
  none: [] as const,
}

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function scopeOptionsForRole(
  role: (Me & { onboarded: true })['role'],
): readonly ProgramScopeKind[] {
  if (role === 'Pastor') return SCOPE_OPTIONS.pastor
  if (role === 'FellowshipLeader') return SCOPE_OPTIONS.fellowshipLeader
  if (role === 'PFCCManager') return SCOPE_OPTIONS.pfccManager
  return SCOPE_OPTIONS.none
}

function defaultEndDate(start: string) {
  return defaultCampaignEndDate(start)
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
  const churchWideManager = canManageChurch(me.role)
  const isPfccManager = me.role === 'PFCCManager'
  const skipsScopeStep = isPfccManager && Boolean(me.scopeNodeId)
  const defaultScopeKind = scopeOptions[0] ?? 'ChurchWide'
  const steps =
    churchWideManager || skipsScopeStep
      ? (['Details', 'Review'] as const)
      : (['Details', 'Scope', 'Review'] as const)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [givingType, setGivingType] = useState<GivingType>('SundayService')
  const [customTypeLabel, setCustomTypeLabel] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [goLiveMode, setGoLiveMode] = useState<'today' | 'later'>('today')
  const [goLiveDate, setGoLiveDate] = useState('')
  const [scopeKind, setScopeKind] = useState<ProgramScopeKind>(defaultScopeKind)
  const [scopeNodeId, setScopeNodeId] = useState(
    () => (isPfccManager ? me.scopeNodeId ?? '' : ''),
  )
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([])
  const [datesTouched, setDatesTouched] = useState(false)

  const scopeRootNodeId = me.scopeNodeId ?? null
  const scopeStep = churchWideManager || skipsScopeStep ? -1 : 1
  const reviewStep = steps.length - 1

  const scopeNodes = useMemo(() => {
    if (!tree || churchWideManager || skipsScopeStep) return []
    let nodes = nodesForScopeKind(tree, scopeKind)
    if (scopeRootNodeId) {
      nodes = nodesBelowScopeRoot(tree, nodes, scopeRootNodeId)
    }
    return nodes
  }, [tree, scopeKind, churchWideManager, skipsScopeStep, scopeRootNodeId])

  const scopePickerOptions = useMemo(
    () =>
      scopeNodes.map((node) => ({
        id: node.id,
        label: node.name,
        hint: tree ? nodePathLabel(tree, node.id, scopeRootNodeId) : undefined,
      })),
    [scopeNodes, tree, scopeRootNodeId],
  )

  const typeLabel =
    givingType === 'Other'
      ? customTypeLabel.trim() || 'Other'
      : GIVING_TYPE_OPTIONS.find((o) => o.value === givingType)?.label ?? givingType

  const dateValidation = useMemo(
    () =>
      validateCampaignDates({
        startsOn,
        endsOn,
        goLiveMode,
        goLiveDate,
      }),
    [startsOn, endsOn, goLiveMode, goLiveDate],
  )

  const showDateErrors = datesTouched

  const detailsValid =
    title.trim().length > 0 &&
    (givingType !== 'Other' || customTypeLabel.trim().length > 0) &&
    dateValidation.isValid

  const canProceed = useMemo(() => {
    if (step === 0) return detailsValid
    if (scopeStep >= 0 && step === scopeStep) {
      if (scopeKind === 'FellowshipGroup') return scopeNodeIds.length > 0
      if (scopeKind === 'Fellowship' || scopeKind === 'PFCC') return Boolean(scopeNodeId)
    }
    return true
  }, [
    step,
    detailsValid,
    scopeStep,
    scopeKind,
    scopeNodeId,
    scopeNodeIds,
  ])

  function go(next: number) {
    setDirection(next > step ? 'forward' : 'back')
    setStep(next)
  }

  function handleStartsOnChange(value: string) {
    setDatesTouched(true)
    setStartsOn(value)
    if (!endsOn || (value && endsOn < value)) setEndsOn(defaultEndDate(value))
  }

  function handleEndsOnChange(value: string) {
    setDatesTouched(true)
    setEndsOn(value)
  }

  function handleGoLiveDateChange(value: string) {
    setDatesTouched(true)
    setGoLiveDate(value)
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      const goLiveAt =
        goLiveMode === 'later' && goLiveDate
          ? new Date(`${goLiveDate}T00:00:00Z`).toISOString()
          : undefined

      await createProgram(api, {
        givingType,
        customTypeLabel: givingType === 'Other' ? customTypeLabel.trim() : undefined,
        title: title.trim(),
        startsOn,
        endsOn,
        goLiveAt,
        scopeKind: churchWideManager ? 'ChurchWide' : isPfccManager ? 'PFCC' : scopeKind,
        scopeNodeId: churchWideManager
          ? null
          : isPfccManager
            ? me.scopeNodeId ?? null
            : scopeKind !== 'FellowshipGroup'
              ? scopeNodeId || null
              : null,
        scopeNodeIds:
          !churchWideManager && !isPfccManager && scopeKind === 'FellowshipGroup'
            ? scopeNodeIds
            : undefined,
      })
      onOpenChange(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create campaign')
    } finally {
      setBusy(false)
    }
  }

  function handleNext() {
    if (step === 0) setDatesTouched(true)
    if (step < steps.length - 1) {
      if (step === 0 && !detailsValid) return
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
      title="Create campaign"
      description="Set up a giving campaign for your church."
      size="lg"
    >
      <div className="space-y-5">
        <WizardStepper steps={[...steps]} currentStep={step} />
        <WizardProgressBar value={((step + 1) / steps.length) * 100} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <WizardStepPanel stepKey={step} direction={direction}>
          {step === 0 && (
            <div className="space-y-5">
              <WizardField label="Campaign name" id="wizard-title" required>
                <Input
                  id="wizard-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sunday Services 2026"
                  autoFocus
                />
              </WizardField>

              <WizardField label="Giving type" id="wizard-type" required>
                <select
                  id="wizard-type"
                  value={givingType}
                  onChange={(e) => setGivingType(e.target.value as GivingType)}
                  className={selectClassName}
                >
                  {GIVING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </WizardField>

              {givingType === 'Other' && (
                <WizardField label="Custom type name" id="wizard-custom-type" required>
                  <Input
                    id="wizard-custom-type"
                    value={customTypeLabel}
                    onChange={(e) => setCustomTypeLabel(e.target.value)}
                    placeholder="Building fund"
                  />
                </WizardField>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <WizardField
                  label="Starts on"
                  id="wizard-starts"
                  required
                  error={showDateErrors ? dateValidation.startsOn.error : null}
                >
                  <DatePicker
                    id="wizard-starts"
                    value={startsOn}
                    onChange={handleStartsOnChange}
                    disablePast
                    placeholder="Pick start date"
                    invalid={Boolean(showDateErrors && dateValidation.startsOn.error)}
                  />
                </WizardField>
                <WizardField
                  label="Ends on"
                  id="wizard-ends"
                  required
                  error={showDateErrors ? dateValidation.endsOn.error : null}
                >
                  <DatePicker
                    id="wizard-ends"
                    value={endsOn}
                    minDate={startsOn || undefined}
                    disablePast
                    onChange={handleEndsOnChange}
                    placeholder="Pick end date"
                    invalid={Boolean(showDateErrors && dateValidation.endsOn.error)}
                  />
                </WizardField>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium">When should this go live?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['today', 'Today', 'Leaders are notified right away.'],
                      ['later', 'Later', 'Pick a date — leaders are alerted when it goes live.'],
                    ] as const
                  ).map(([mode, label, hint]) => (
                    <button
                      key={mode}
                      type="button"
                      className={cn(
                        'rounded-xl border px-4 py-3 text-left transition-colors',
                        goLiveMode === mode
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background'
                          : 'border-border/60 hover:bg-muted/40',
                      )}
                      onClick={() => setGoLiveMode(mode)}
                    >
                      <p className="font-medium">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                    </button>
                  ))}
                </div>
                {goLiveMode === 'later' && (
                  <WizardField
                    label="Go-live date"
                    id="wizard-go-live"
                    required
                    error={showDateErrors ? dateValidation.goLiveDate.error : null}
                  >
                    <DatePicker
                      id="wizard-go-live"
                      value={goLiveDate}
                      maxDate={endsOn || undefined}
                      disablePast
                      onChange={handleGoLiveDateChange}
                      placeholder="Pick go-live date"
                      invalid={Boolean(showDateErrors && dateValidation.goLiveDate.error)}
                    />
                  </WizardField>
                )}
              </div>
            </div>
          )}

          {scopeStep >= 0 && step === scopeStep && (
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

          {step === reviewStep && (
            <dl className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">{typeLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Timeline</dt>
                <dd className="font-medium">
                  {startsOn} → {endsOn}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Go live</dt>
                <dd className="font-medium">
                  {goLiveMode === 'today' ? 'Today' : goLiveDate}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Scope</dt>
                <dd className="text-right font-medium">
                  {churchWideManager
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
          submitLabel="Create campaign"
        />
      </div>
    </Modal>
  )
}
