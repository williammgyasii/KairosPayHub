import { useEffect, useMemo, useState } from 'react'
import type { Me } from '@/api/auth'
import type { GivingType } from '@/api/giving'
import { createProgram } from '@/api/giving'
import type { ApiClient } from '@/api/core'
import type { StructureTree } from '@/api/structure'
import { GIVING_TYPE_OPTIONS, nodePathLabel } from '@/lib/giving-ui'
import { SearchPicker } from '@/components/structure/search-picker'
import { WizardField, WizardFooter } from '@/components/structure/wizard-shell'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import {
  defaultCampaignEndDate,
  validateCampaignDates,
} from '@/lib/campaign-date-validation'
import {
  givingScopePolicy,
  leadershipFromProfile,
} from '@/lib/giving-scope-policy'

type CreateProgramWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  me: Me & { onboarded: true }
  api: ApiClient
  tree: StructureTree | null
  onCreated: () => void
}

type ScopeSelection = 'churchWide' | string

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

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

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [givingType, setGivingType] = useState<GivingType>('SundayService')
  const [customTypeLabel, setCustomTypeLabel] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [goLiveMode, setGoLiveMode] = useState<'today' | 'later'>('today')
  const [goLiveDate, setGoLiveDate] = useState('')
  const [scopeSelection, setScopeSelection] = useState<ScopeSelection>('churchWide')
  const [scopeNodeId, setScopeNodeId] = useState('')
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([])
  const [datesTouched, setDatesTouched] = useState(false)

  useEffect(() => {
    if (!open || !policy) return
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

  const detailsValid =
    title.trim().length > 0 &&
    (givingType !== 'Other' || customTypeLabel.trim().length > 0) &&
    dateValidation.isValid

  const scopeValid = useMemo(() => {
    if (!policy?.canCreateCampaign) return false
    if (scopeSelection === 'churchWide') return Boolean(policy.allowChurchWide)
    if (multiSelect) return scopeNodeIds.length > 0
    return Boolean(scopeNodeId)
  }, [policy, scopeSelection, multiSelect, scopeNodeId, scopeNodeIds])

  const canProceed = detailsValid && scopeValid

  function handleStartsOnChange(value: string) {
    setDatesTouched(true)
    setStartsOn(value)
    if (!endsOn || (value && endsOn < value)) setEndsOn(defaultCampaignEndDate(value))
  }

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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create campaign"
      description="Set up a giving campaign for your church."
      size="lg"
    >
      <div className="space-y-5" data-testid="create-program-form">
        {error && <p className="text-sm text-destructive">{error}</p>}

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
              onChange={(value) => {
                setDatesTouched(true)
                setEndsOn(value)
              }}
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
                    actorLeadership === 'intermediate' && scopeRootNodeId ? scopeRootNodeId : '',
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

        <WizardFooter
          step={0}
          busy={busy}
          onCancel={() => onOpenChange(false)}
          onBack={() => onOpenChange(false)}
          onNext={() => void handleSubmit()}
          isLastStep
          canProceed={canProceed}
          submitLabel="Create campaign"
        />
      </div>
    </Modal>
  )
}
