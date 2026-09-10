import { useEffect, useMemo, useState } from 'react'
import type { Me } from '@/api/auth'
import type { GivingType } from '@/api/giving'
import { createProgram } from '@/api/giving'
import type { ApiClient } from '@/api/core'
import type { StructureTree } from '@/api/structure'
import { GIVING_TYPE_OPTIONS, nodePathLabel } from '@/lib/giving-ui'
import { SearchPicker } from '@/components/structure/search-picker'
import {
  WizardField,
  WizardFooter,
  WizardStepPanel,
  WizardStepper,
} from '@/components/structure/wizard-shell'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import {
  CAMPAIGN_DATE_PRESETS,
  campaignDatesForPreset,
  type CampaignDateRangePreset,
  validateCampaignDates,
} from '@/lib/campaign-date-validation'
import {
  givingScopePolicy,
  leadershipFromProfile,
} from '@/lib/giving-scope-policy'
import { receiveGivingsOnMainPolicy } from '@/lib/receive-givings-on-main-policy'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

type CreateProgramWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  me: Me & { onboarded: true }
  api: ApiClient
  tree: StructureTree | null
  onCreated: () => void
}

type ScopeSelection = 'churchWide' | string

const STEPS = ['Basics', 'Launch'] as const

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function ToggleSwitch({
  checked,
  onCheckedChange,
  id,
  'data-testid': testId,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  id?: string
  'data-testid'?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function CreateProgramWizard({
  open,
  onOpenChange,
  me,
  api,
  tree,
  onCreated,
}: CreateProgramWizardProps) {
  const actorLeadership = leadershipFromProfile(me.leadershipProfile, me.role)
  const scopeRootNodeId = me.scopeNodeId ?? null

  const policy = useMemo(
    () =>
      tree
        ? givingScopePolicy({
            tree,
            actorLeadership,
            actorScopeNodeId: scopeRootNodeId,
          })
        : null,
    [tree, actorLeadership, scopeRootNodeId],
  )

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [givingType, setGivingType] = useState<GivingType>('SundayService')
  const [customTypeLabel, setCustomTypeLabel] = useState('')
  const [datePreset, setDatePreset] = useState<CampaignDateRangePreset>('endOfYear')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [goLiveMode, setGoLiveMode] = useState<'today' | 'later'>('today')
  const [goLiveDate, setGoLiveDate] = useState('')
  const [scopeSelection, setScopeSelection] = useState<ScopeSelection>('churchWide')
  const [scopeNodeId, setScopeNodeId] = useState('')
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([])
  const [datesTouched, setDatesTouched] = useState(false)
  const [receiveOnMain, setReceiveOnMain] = useState(true)
  const [firstSubTitle, setFirstSubTitle] = useState('')
  const [firstSubEventDate, setFirstSubEventDate] = useState('')

  const receivePolicy = receiveGivingsOnMainPolicy({
    receiveGivingsOnMain: receiveOnMain,
    isRoot: true,
    acceptsContributions: true,
    forCreate: true,
  })

  const isLastStep = step === STEPS.length - 1

  useEffect(() => {
    if (!open || !policy) return
    setStep(0)
    setDirection('forward')
    setError(null)
    setTitle('')
    setGivingType('SundayService')
    setCustomTypeLabel('')
    setDatePreset('endOfYear')
    const presetDates = campaignDatesForPreset('endOfYear')
    setStartsOn(presetDates?.startsOn ?? '')
    setEndsOn(presetDates?.endsOn ?? '')
    setGoLiveMode('today')
    setGoLiveDate('')
    setScopeSelection(
      policy.allowChurchWide ? 'churchWide' : (policy.layers[0]?.layerId ?? 'churchWide'),
    )
    setScopeNodeId(
      actorLeadership === 'intermediate' && scopeRootNodeId && policy.layers.length > 0
        ? scopeRootNodeId
        : '',
    )
    setScopeNodeIds([])
    setDatesTouched(false)
    setReceiveOnMain(true)
    setFirstSubTitle('')
    setFirstSubEventDate('')
  }, [open, policy, actorLeadership, scopeRootNodeId])

  const scopeUnits = useMemo(() => {
    if (!policy || scopeSelection === 'churchWide') return []
    return policy.unitsForLayer(scopeSelection)
  }, [policy, scopeSelection])

  const multiSelect = scopeUnits.length > 1 && scopeSelection !== 'churchWide'
  const showScopePicker = Boolean(policy && !policy.allowChurchWide ? true : scopeSelection !== 'churchWide')

  const scopePickerOptions = useMemo(
    () =>
      scopeUnits.map((unit) => ({
        id: unit.id,
        label: unit.name,
        hint: tree ? nodePathLabel(tree, unit.id, scopeRootNodeId) : undefined,
      })),
    [scopeUnits, tree, scopeRootNodeId],
  )

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

  const basicsValid =
    title.trim().length > 0 &&
    (givingType !== 'Other' || customTypeLabel.trim().length > 0) &&
    !dateValidation.startsOn.error &&
    !dateValidation.endsOn.error

  const scopeValid = useMemo(() => {
    if (!policy?.canCreateCampaign) return false
    if (scopeSelection === 'churchWide') return Boolean(policy.allowChurchWide)
    if (multiSelect) return scopeNodeIds.length > 0
    return Boolean(scopeNodeId)
  }, [policy, scopeSelection, multiSelect, scopeNodeId, scopeNodeIds])

  const firstSubValid =
    !receivePolicy.requiresFirstSubOnCreate ||
    (firstSubTitle.trim().length > 0 && Boolean(firstSubEventDate))

  const launchValid =
    scopeValid &&
    firstSubValid &&
    (goLiveMode === 'today' || !dateValidation.goLiveDate.error)

  const canProceed = step === 0 ? basicsValid : launchValid

  function applyDatePreset(preset: CampaignDateRangePreset) {
    setDatePreset(preset)
    setDatesTouched(true)
    const resolved = campaignDatesForPreset(preset)
    if (!resolved) return
    setStartsOn(resolved.startsOn)
    setEndsOn(resolved.endsOn)
  }

  function handleStartsOnChange(value: string) {
    setDatePreset('custom')
    setDatesTouched(true)
    setStartsOn(value)
    if (endsOn && value && endsOn < value) setEndsOn(value)
  }

  function handleEndsOnChange(value: string) {
    setDatePreset('custom')
    setDatesTouched(true)
    setEndsOn(value)
  }

  function handleReceiveChange(next: boolean) {
    setReceiveOnMain(next)
    if (next) {
      setFirstSubTitle('')
      setFirstSubEventDate('')
    }
  }

  function toggleGroupNode(id: string) {
    setScopeNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSubmit() {
    setDatesTouched(true)
    if (!basicsValid || !launchValid) return
    setBusy(true)
    setError(null)
    try {
      const goLiveAt =
        goLiveMode === 'later' && goLiveDate
          ? new Date(`${goLiveDate}T00:00:00Z`).toISOString()
          : undefined

      const includeFirstSub =
        receivePolicy.requiresFirstSubOnCreate &&
        firstSubTitle.trim().length > 0 &&
        Boolean(firstSubEventDate)

      await createProgram(api, {
        givingType,
        customTypeLabel: givingType === 'Other' ? customTypeLabel.trim() : undefined,
        title: title.trim(),
        startsOn,
        endsOn,
        goLiveAt,
        receiveGivingsOnMain: receiveOnMain,
        ...(includeFirstSub
          ? {
              firstSubCampaign: {
                title: firstSubTitle.trim(),
                eventDate: firstSubEventDate,
                scopeKind: scopeSelection === 'churchWide' ? 'ChurchWide' : undefined,
                scopeNodeId:
                  scopeSelection === 'churchWide'
                    ? null
                    : multiSelect
                      ? null
                      : scopeNodeId || null,
                scopeNodeIds: multiSelect ? scopeNodeIds : undefined,
              },
            }
          : {}),
        ...(scopeSelection === 'churchWide'
          ? { scopeKind: 'ChurchWide' as const, scopeNodeId: null }
          : multiSelect
            ? { scopeNodeId: null, scopeNodeIds }
            : { scopeNodeId: scopeNodeId || null }),
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
    setError(null)
    if (step === 0) {
      setDatesTouched(true)
      if (!basicsValid) return
      setDirection('forward')
      setStep(1)
      return
    }
    void handleSubmit()
  }

  function handleBack() {
    if (step === 0) {
      onOpenChange(false)
      return
    }
    setDirection('back')
    setStep(0)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create campaign"
      description={STEPS[step]}
      titleAccessory={<WizardStepper variant="dots" steps={[...STEPS]} currentStep={step} />}
      size="lg"
    >
      <div className="space-y-5" data-testid="create-program-form">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <WizardStepPanel stepKey={`${step}`} direction={direction}>
          {step === 0 ? (
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

              <div className="space-y-3">
                <p className="text-xs font-medium">Campaign dates</p>
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        datePreset === preset.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/40',
                      )}
                      onClick={() => applyDatePreset(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
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
              </div>
            </div>
          ) : (
            <div className="space-y-5">
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
                      onChange={(value) => {
                        setDatesTouched(true)
                        setGoLiveDate(value)
                      }}
                      placeholder="Pick go-live date"
                      invalid={Boolean(showDateErrors && dateValidation.goLiveDate.error)}
                    />
                  </WizardField>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium">Scope</p>
                <div className="flex flex-wrap gap-2">
                  {policy?.allowChurchWide && (
                    <button
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        scopeSelection === 'churchWide'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/40',
                      )}
                      onClick={() => {
                        setScopeSelection('churchWide')
                        setScopeNodeId('')
                        setScopeNodeIds([])
                      }}
                    >
                      {policy.churchWideLabel}
                    </button>
                  )}
                  {policy?.layers.map((layer) => (
                    <button
                      key={layer.layerId}
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        scopeSelection === layer.layerId
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/40',
                      )}
                      onClick={() => {
                        setScopeSelection(layer.layerId)
                        setScopeNodeId(
                          actorLeadership === 'intermediate' && scopeRootNodeId
                            ? scopeRootNodeId
                            : '',
                        )
                        setScopeNodeIds([])
                      }}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>

                {!tree || !policy ? (
                  <p className="text-sm text-muted-foreground">
                    Load your structure first to pick a scope unit.
                  </p>
                ) : !showScopePicker ? (
                  <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Church-wide — every unit can log under this campaign.
                  </p>
                ) : multiSelect ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Select units</p>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-border/60">
                      {scopeUnits.map((unit) => {
                        const checked = scopeNodeIds.includes(unit.id)
                        return (
                          <label
                            key={unit.id}
                            className="flex cursor-pointer items-start gap-3 border-b border-border/40 px-3 py-2.5 last:border-0 hover:bg-muted/30"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleGroupNode(unit.id)}
                              className="mt-1"
                            />
                            <span>
                              <span className="block text-sm font-medium">{unit.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {nodePathLabel(tree, unit.id, scopeRootNodeId)}
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

              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {receivePolicy.label}
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="About receive givings on main"
                            >
                              <HelpCircle className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {receivePolicy.helpText}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">{receivePolicy.helpText}</p>
                  </div>
                  <ToggleSwitch
                    checked={receiveOnMain}
                    onCheckedChange={handleReceiveChange}
                    data-testid="receive-givings-on-main"
                  />
                </div>

                {receivePolicy.requiresFirstSubOnCreate && (
                  <div className="space-y-3 border-t border-border/50 pt-3">
                    <p className="text-xs font-medium">First sub-campaign (required)</p>
                    <WizardField label="Sub-campaign name" id="wizard-first-sub-title" required>
                      <Input
                        id="wizard-first-sub-title"
                        value={firstSubTitle}
                        onChange={(e) => setFirstSubTitle(e.target.value)}
                        placeholder="Week 1"
                        data-testid="first-sub-title"
                      />
                    </WizardField>
                    <WizardField label="Event date" id="wizard-first-sub-event" required>
                      <DatePicker
                        id="wizard-first-sub-event"
                        value={firstSubEventDate}
                        minDate={startsOn || undefined}
                        maxDate={endsOn || undefined}
                        disablePast
                        onChange={setFirstSubEventDate}
                        placeholder="Pick event date"
                      />
                    </WizardField>
                  </div>
                )}
              </div>
            </div>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          onCancel={() => onOpenChange(false)}
          onBack={handleBack}
          onNext={handleNext}
          isLastStep={isLastStep}
          canProceed={canProceed}
          nextLabel="Continue"
          submitLabel="Create campaign"
        />
      </div>
    </Modal>
  )
}
