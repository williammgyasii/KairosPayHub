import { useEffect, useMemo, useState } from 'react'
import type { ApiClient } from '@/shared/api'
import type { BatchSubCampaignPreview, GivingProgram } from '@/features/giving/api'
import {
  createBatchSubCampaigns,
  createSubPeriod,
  formatAmount,
  previewBatchSubCampaigns,
} from '@/features/giving/api'
import type { StructureTree } from '@/api/structure'
import { SearchPicker } from '@/shared/ui/search-picker'
import { WizardField, WizardFooter } from '@/shared/ui/wizard-shell'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { DatePicker } from '@/shared/ui/date-picker'
import { cn } from '@/shared/lib/utils'
import {
  validateSubCampaignOneOffDates,
  validateSubCampaignRecurringDates,
} from '@/features/giving/lib/campaign-date-validation'
import {
  givingScopePolicy,
  type GivingLeadership,
} from '@/features/giving/lib/giving-scope-policy'
import { nodePathLabel } from '@/features/giving/lib/giving-ui'

type CreateSubPeriodWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  parent: GivingProgram
  api: ApiClient
  tree: StructureTree | null
  onCreated: () => void
  requiresPastorApproval?: boolean
  scopeRootNodeId?: string | null
  actorLeadership?: GivingLeadership
}

type SubMode = 'one-off' | 'recurring'
type ScopeSelection = 'churchWide' | string // layerId

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

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
  actorLeadership = 'churchWide',
}: CreateSubPeriodWizardProps) {
  const policy = useMemo(
    () =>
      tree
        ? givingScopePolicy({
            tree,
            actorLeadership,
            actorScopeNodeId: scopeRootNodeId,
            parent: {
              scopeKind: String(parent.scopeKind),
              scopeNodeId: parent.scopeNodeId,
            },
          })
        : null,
    [tree, actorLeadership, scopeRootNodeId, parent.scopeKind, parent.scopeNodeId],
  )

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
  const [scopeSelection, setScopeSelection] = useState<ScopeSelection>('churchWide')
  const [scopeNodeId, setScopeNodeId] = useState('')
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([])
  const [moveParentContributions, setMoveParentContributions] = useState(false)
  const [datesTouched, setDatesTouched] = useState(false)

  const parentDirectCount = parent.directContributionCount ?? 0
  const parentDirectTotal = parent.directContributionTotalAmount ?? 0

  useEffect(() => {
    if (!open || !policy) return
    setMoveParentContributions(parentDirectCount > 0)
    setRangeStart(parent.startsOn ?? '')
    setRangeEnd(parent.endsOn ?? '')
    setPreview(null)
    setDatesTouched(false)
    setScopeSelection(policy.allowChurchWide ? 'churchWide' : (policy.layers[0]?.layerId ?? 'churchWide'))
    setScopeNodeId('')
    setScopeNodeIds([])
  }, [open, parent.id, parent.startsOn, parent.endsOn, parentDirectCount, policy])

  const scopeUnits = useMemo(() => {
    if (!policy || scopeSelection === 'churchWide') return []
    return policy.unitsForLayer(scopeSelection)
  }, [policy, scopeSelection])

  const scopePickerOptions = useMemo(
    () =>
      scopeUnits.map((unit) => ({
        id: unit.id,
        label: unit.name,
        hint: tree ? nodePathLabel(tree, unit.id, scopeRootNodeId) : undefined,
      })),
    [scopeUnits, tree, scopeRootNodeId],
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
  const multiSelect = scopeUnits.length > 1 && scopeSelection !== 'churchWide'

  const canProceed = useMemo(() => {
    if (mode === 'one-off') {
      if (!(title.trim().length > 0 && oneOffValidation.isValid)) return false
    } else if (!recurringValidation.isValid) {
      return false
    }
    if (scopeSelection === 'churchWide') return Boolean(policy?.allowChurchWide)
    if (multiSelect) return scopeNodeIds.length > 0
    return Boolean(scopeNodeId)
  }, [
    mode,
    title,
    oneOffValidation.isValid,
    recurringValidation.isValid,
    scopeSelection,
    multiSelect,
    scopeNodeId,
    scopeNodeIds,
    policy?.allowChurchWide,
  ])

  useEffect(() => {
    if (!open || mode !== 'recurring' || !canProceed) return
    let cancelled = false
    void previewBatchSubCampaigns(api, parent.id, {
      frequency: 'Weekly',
      dayOfWeek,
      rangeStart,
      rangeEnd,
      logOpensOffsetDays: logOffsetDays,
      titlePrefix: titlePrefix.trim() || undefined,
      scopeNodeId: multiSelect ? null : scopeNodeId || null,
      scopeNodeIds: multiSelect ? scopeNodeIds : undefined,
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
    open,
    mode,
    api,
    parent.id,
    dayOfWeek,
    rangeStart,
    rangeEnd,
    logOffsetDays,
    titlePrefix,
    multiSelect,
    scopeNodeId,
    scopeNodeIds,
    canProceed,
  ])

  function toggleGroupNode(id: string) {
    setScopeNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSubmit() {
    setDatesTouched(true)
    if (!canProceed) return
    setBusy(true)
    setError(null)
    try {
      const scopePayload =
        scopeSelection === 'churchWide'
          ? { scopeKind: 'ChurchWide' as const, scopeNodeId: null, scopeNodeIds: undefined }
          : multiSelect
            ? { scopeNodeId: null, scopeNodeIds }
            : { scopeNodeId: scopeNodeId || null, scopeNodeIds: undefined }

      if (mode === 'recurring') {
        await createBatchSubCampaigns(api, parent.id, {
          frequency: 'Weekly',
          dayOfWeek,
          rangeStart,
          rangeEnd,
          logOpensOffsetDays: logOffsetDays,
          titlePrefix: titlePrefix.trim() || undefined,
          ...scopePayload,
        })
      } else {
        await createSubPeriod(api, {
          parentProgramId: parent.id,
          title: title.trim(),
          eventDate,
          logOpensAt: computeLogOpensAt(eventDate, logOffsetDays),
          ...scopePayload,
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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add sub-campaign"
      description="Create a one-off or recurring slice under this campaign."
      size="lg"
    >
      <div className="space-y-5" data-testid="create-sub-period-form">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['one-off', 'One-off', 'A single date under this campaign.'],
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

        {mode === 'one-off' ? (
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
          </div>
        ) : (
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
          </div>
        )}

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
                  setScopeNodeId('')
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
          ) : scopeSelection === 'churchWide' ? (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Same scope as the parent campaign (church-wide).
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
                          {tree ? nodePathLabel(tree, unit.id, scopeRootNodeId) : null}
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

        {mode === 'one-off' && parentDirectCount > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={moveParentContributions}
                onChange={(e) => setMoveParentContributions(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                Move {parentDirectCount} existing contribution
                {parentDirectCount === 1 ? '' : 's'} ({formatAmount(parentDirectTotal)})
              </span>
            </label>
          </div>
        )}

        <WizardFooter
          step={0}
          busy={busy}
          onCancel={() => onOpenChange(false)}
          onBack={() => onOpenChange(false)}
          onNext={() => void handleSubmit()}
          isLastStep
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
