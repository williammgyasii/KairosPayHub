import { useEffect, useMemo, useState } from 'react'
import type { ApiClient } from '@/api/core'
import type { BatchSubCampaignPreview, GivingProgram, ProgramScopeKind } from '@/api/giving'
import {
  createBatchSubCampaigns,
  createSubPeriod,
  formatAmount,
  previewBatchSubCampaigns,
} from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import {
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
  validateSubCampaignOneOffDates,
  validateSubCampaignRecurringDates,
} from '@/lib/campaign-date-validation'
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

type SubMode = 'one-off' | 'recurring'

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

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

function computeLogOpensAt(eventDate: string, offsetDays: number) {
  const d = new Date(`${eventDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString()
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
    [parent.scopeKind, requiresPastorApproval, scopeRootNodeId],
  )
  const defaultScopeKind = scopeOptions[0]
  const steps = ['Mode', 'Schedule', 'Scope', 'Review'] as const

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<SubMode>('one-off')
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(parent.startsOn ?? '')
  const [logOffsetDays, setLogOffsetDays] = useState(1)
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [rangeStart, setRangeStart] = useState(parent.startsOn ?? '')
  const [rangeEnd, setRangeEnd] = useState(parent.endsOn ?? '')
  const [titlePrefix, setTitlePrefix] = useState('')
  const [preview, setPreview] = useState<BatchSubCampaignPreview | null>(null)
  const [scopeKind, setScopeKind] = useState<ProgramScopeKind>(defaultScopeKind)
  const [scopeNodeId, setScopeNodeId] = useState('')
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([])
  const [moveParentContributions, setMoveParentContributions] = useState(false)
  const [datesTouched, setDatesTouched] = useState(false)

  const parentDirectCount = parent.directContributionCount ?? 0
  const parentDirectTotal = parent.directContributionTotalAmount ?? 0

  useEffect(() => {
    if (!open) return
    setMoveParentContributions(parentDirectCount > 0)
    setRangeStart(parent.startsOn ?? '')
    setRangeEnd(parent.endsOn ?? '')
    setPreview(null)
    setDatesTouched(false)
  }, [open, parent.id, parent.startsOn, parent.endsOn, parentDirectCount])

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

  const oneOffValidation = useMemo(
    () =>
      validateSubCampaignOneOffDates({
        eventDate,
        parentStartsOn: parent.startsOn,
        parentEndsOn: parent.endsOn,
      }),
    [eventDate, parent.startsOn, parent.endsOn],
  )

  const recurringValidation = useMemo(
    () =>
      validateSubCampaignRecurringDates({
        rangeStart,
        rangeEnd,
        parentStartsOn: parent.startsOn,
        parentEndsOn: parent.endsOn,
      }),
    [rangeStart, rangeEnd, parent.startsOn, parent.endsOn],
  )

  const showDateErrors = datesTouched

  const canProceed = useMemo(() => {
    if (step === 0) return true
    if (step === 1) {
      if (mode === 'one-off') {
        return title.trim().length > 0 && oneOffValidation.isValid
      }
      return recurringValidation.isValid
    }
    if (step === 2) {
      if (scopeKind === 'ChurchWide') return true
      if (scopeKind === 'FellowshipGroup') return scopeNodeIds.length > 0
      if (scopeKind === 'Fellowship' || scopeKind === 'PFCC') return Boolean(scopeNodeId)
    }
    return true
  }, [
    step,
    mode,
    title,
    oneOffValidation.isValid,
    recurringValidation.isValid,
    scopeKind,
    scopeNodeId,
    scopeNodeIds,
  ])

  useEffect(() => {
    if (step !== 3 || mode !== 'recurring' || !canProceed) return
    let cancelled = false
    void previewBatchSubCampaigns(api, parent.id, {
      frequency: 'Weekly',
      dayOfWeek,
      rangeStart,
      rangeEnd,
      logOpensOffsetDays: logOffsetDays,
      titlePrefix: titlePrefix.trim() || undefined,
      scopeKind,
      scopeNodeId: scopeKind === 'Fellowship' || scopeKind === 'PFCC' ? scopeNodeId || null : null,
      scopeNodeIds: scopeKind === 'FellowshipGroup' ? scopeNodeIds : undefined,
    })
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [
    step,
    mode,
    api,
    parent.id,
    dayOfWeek,
    rangeStart,
    rangeEnd,
    logOffsetDays,
    titlePrefix,
    scopeKind,
    scopeNodeId,
    scopeNodeIds,
    canProceed,
  ])

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
      if (mode === 'recurring') {
        await createBatchSubCampaigns(api, parent.id, {
          frequency: 'Weekly',
          dayOfWeek,
          rangeStart,
          rangeEnd,
          logOpensOffsetDays: logOffsetDays,
          titlePrefix: titlePrefix.trim() || undefined,
          scopeKind,
          scopeNodeId: scopeKind === 'Fellowship' || scopeKind === 'PFCC' ? scopeNodeId || null : null,
          scopeNodeIds: scopeKind === 'FellowshipGroup' ? scopeNodeIds : undefined,
        })
      } else {
        await createSubPeriod(api, {
          parentProgramId: parent.id,
          title: title.trim(),
          eventDate,
          logOpensAt: computeLogOpensAt(eventDate, logOffsetDays),
          scopeKind,
          scopeNodeId:
            scopeKind === 'Fellowship' || scopeKind === 'PFCC' ? scopeNodeId || null : null,
          scopeNodeIds: scopeKind === 'FellowshipGroup' ? scopeNodeIds : undefined,
          moveParentContributions: parentDirectCount > 0 ? moveParentContributions : undefined,
        })
      }
      onOpenChange(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create sub-campaign')
    } finally {
      setBusy(false)
    }
  }

  function handleNext() {
    if (step === 1) setDatesTouched(true)
    if (step < steps.length - 1) {
      if (step === 1 && !canProceed) return
      go(step + 1)
      return
    }
    void handleSubmit()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add sub-campaign"
      description="Create a one-off slice or generate recurring dates under this campaign."
      size="lg"
    >
      <div className="space-y-5">
        <WizardStepper steps={[...steps]} currentStep={step} />
        <WizardProgressBar value={((step + 1) / steps.length) * 100} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <WizardStepPanel stepKey={step} direction={direction}>
          {step === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['one-off', 'One-off', 'A single date or period under this campaign.'],
                  ['recurring', 'Recurring', 'Generate many dates (e.g. every Sunday).'],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition-colors',
                    mode === value
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                      : 'border-border/60 hover:bg-muted/40',
                  )}
                  onClick={() => setMode(value)}
                >
                  <p className="font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && mode === 'one-off' && (
            <div className="space-y-4">
              <WizardField label="Title" id="sub-title" required>
                <Input
                  id="sub-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sunday 9 Feb"
                />
              </WizardField>
              <WizardField
                label="Event date"
                id="sub-event-date"
                required
                error={showDateErrors ? oneOffValidation.eventDate.error : null}
              >
                <DatePicker
                  id="sub-event-date"
                  value={eventDate}
                  minDate={parent.startsOn ?? undefined}
                  maxDate={parent.endsOn ?? undefined}
                  disablePast
                  onChange={(value) => {
                    setDatesTouched(true)
                    setEventDate(value)
                  }}
                  placeholder="Pick event date"
                  invalid={Boolean(showDateErrors && oneOffValidation.eventDate.error)}
                />
              </WizardField>
              <WizardField label="Logging opens (days after event)" id="sub-log-offset">
                <Input
                  id="sub-log-offset"
                  type="number"
                  min={0}
                  max={14}
                  value={logOffsetDays}
                  onChange={(e) => setLogOffsetDays(Number(e.target.value) || 0)}
                />
              </WizardField>
            </div>
          )}

          {step === 1 && mode === 'recurring' && (
            <div className="space-y-4">
              <WizardField label="Every" id="sub-day">
                <select
                  id="sub-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </WizardField>
              <div className="grid gap-4 sm:grid-cols-2">
                <WizardField
                  label="From"
                  id="sub-range-start"
                  required
                  error={showDateErrors ? recurringValidation.rangeStart.error : null}
                >
                  <DatePicker
                    id="sub-range-start"
                    value={rangeStart}
                    minDate={parent.startsOn ?? undefined}
                    maxDate={parent.endsOn ?? undefined}
                    disablePast
                    onChange={(value) => {
                      setDatesTouched(true)
                      setRangeStart(value)
                    }}
                    placeholder="Pick start date"
                    invalid={Boolean(showDateErrors && recurringValidation.rangeStart.error)}
                  />
                </WizardField>
                <WizardField
                  label="To"
                  id="sub-range-end"
                  required
                  error={showDateErrors ? recurringValidation.rangeEnd.error : null}
                >
                  <DatePicker
                    id="sub-range-end"
                    value={rangeEnd}
                    minDate={rangeStart || parent.startsOn || undefined}
                    maxDate={parent.endsOn ?? undefined}
                    disablePast
                    onChange={(value) => {
                      setDatesTouched(true)
                      setRangeEnd(value)
                    }}
                    placeholder="Pick end date"
                    invalid={Boolean(showDateErrors && recurringValidation.rangeEnd.error)}
                  />
                </WizardField>
              </div>
              <WizardField label="Title prefix (optional)" id="sub-prefix">
                <Input
                  id="sub-prefix"
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  placeholder="Sunday"
                />
              </WizardField>
              <WizardField label="Logging opens (days after each event)" id="sub-rec-log-offset">
                <Input
                  id="sub-rec-log-offset"
                  type="number"
                  min={0}
                  max={14}
                  value={logOffsetDays}
                  onChange={(e) => setLogOffsetDays(Number(e.target.value) || 0)}
                />
              </WizardField>
            </div>
          )}

          {step === 2 && (
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
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="font-medium">{mode === 'one-off' ? 'One-off' : 'Recurring'}</dd>
              </div>
              {mode === 'one-off' ? (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Title</dt>
                    <dd className="font-medium">{title}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Event</dt>
                    <dd className="font-medium">{eventDate}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Schedule</dt>
                    <dd className="text-right font-medium">
                      Every {WEEKDAYS.find((d) => d.value === dayOfWeek)?.label}
                      <br />
                      {rangeStart} → {rangeEnd}
                    </dd>
                  </div>
                  {preview && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                      <p className="font-medium text-foreground">
                        Will create {preview.count} sub-campaign
                        {preview.count === 1 ? '' : 's'}
                      </p>
                      {preview.sampleTitles.length > 0 && (
                        <p className="mt-1 text-muted-foreground">
                          e.g. {preview.sampleTitles.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Log opens</dt>
                <dd className="font-medium">
                  {logOffsetDays === 0 ? 'Same day' : `${logOffsetDays} day(s) after event`}
                </dd>
              </div>
              {mode === 'one-off' && parentDirectCount > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={moveParentContributions}
                      onChange={(e) => setMoveParentContributions(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Move {parentDirectCount} existing contribution
                      {parentDirectCount === 1 ? '' : 's'} ({formatAmount(parentDirectTotal)})
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
          submitLabel={
            mode === 'recurring'
              ? `Create ${preview?.count ?? ''} sub-campaigns`.trim()
              : requiresPastorApproval
                ? 'Submit for approval'
                : 'Create sub-campaign'
          }
        />
      </div>
    </Modal>
  )
}
