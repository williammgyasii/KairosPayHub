import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import { useApi } from '@/api/core'
import {
  MEMBER_POSITION_OPTIONS,
  type MemberPosition,
  type StructureTree,
} from '@/api/structure'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import {
  EmailAvailabilityField,
  isEmailAvailabilityBlocking,
  useEmailAvailability,
} from '@/components/structure/email-availability-field'
import {
  MemberProfileFields,
  memberProfileInitialValues,
  memberProfilePayload,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
import { SearchPicker } from '@/components/structure/search-picker'
import {
  WizardField,
  WizardFooter,
  WizardStepPanel,
  WizardStepper,
} from '@/components/structure/wizard-shell'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  defaultMemberPlacementForUnit,
  formatCellName,
  formatFellowshipName,
  getDeepestLayer,
  nodeById,
  placementOptionsForUnit,
  memberPlacementOptions,
} from '@/lib/structure-tree'
import {
  buildCreateStepPlan,
  resolveMemberWizardMode,
  type MemberWizardStepKind,
} from '@/components/structure/member-wizard-steps'

export function MemberCreateWizard({
  tree,
  unitNodeId,
  busy,
  submit,
  onClose,
}: {
  tree: StructureTree
  unitNodeId?: string
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
}) {
  const api = useApi()
  const { me } = useOutletContext<DashboardOutletContext>()
  const deepest = getDeepestLayer(tree)
  const unit = unitNodeId ? nodeById(tree, unitNodeId) : undefined
  const wizardMode = resolveMemberWizardMode(tree, unitNodeId)
  const isCellContext = wizardMode === 'cell'
  const isFellowshipContext = wizardMode === 'fellowship'
  const cellLabel = isCellContext && unit ? formatCellName(unit.name) : null
  const fellowshipLabel =
    isFellowshipContext && unit ? formatFellowshipName(unit.name) : null

  const placements = unitNodeId
    ? placementOptionsForUnit(tree, unitNodeId)
    : memberPlacementOptions(tree)
  const placementOptions = useMemo(
    () =>
      placements.map((placement) => ({
        id: placement.id,
        label: placement.label.split(' / ').pop() ?? placement.label,
        hint: placement.label,
      })),
    [placements],
  )
  const createDefaultParent = unitNodeId
    ? defaultMemberPlacementForUnit(tree, unitNodeId)
    : ''

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [stepError, setStepError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<MemberProfileFormValues>(() =>
    memberProfileInitialValues({ countryCode: me.countryCode }),
  )
  const [position, setPosition] = useState<MemberPosition>('Member')
  const [parentNodeId, setParentNodeId] = useState(createDefaultParent)

  const needsCellStep = isFellowshipContext && placements.length > 1

  const resolvedParentId = useMemo(() => {
    if (isCellContext && unit) return unit.id
    if (isFellowshipContext && placements.length === 1) return placements[0]?.id ?? ''
    return parentNodeId
  }, [isCellContext, isFellowshipContext, unit, placements, parentNodeId])

  const stepPlan = useMemo(
    () => buildCreateStepPlan(wizardMode, needsCellStep),
    [wizardMode, needsCellStep],
  )
  const steps = stepPlan.labels
  const stepKinds = stepPlan.kinds
  const currentKind = stepKinds[step] ?? 'details'
  const isLastStep = step === steps.length - 1
  const emailAvailability = useEmailAvailability(email, 'roster')
  const emailEntered = email.trim().length > 0
  const emailLooksValid = !emailEntered || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  useEffect(() => {
    setParentNodeId(createDefaultParent)
  }, [createDefaultParent])

  useEffect(() => {
    if (step >= steps.length) {
      setStep(Math.max(0, steps.length - 1))
    }
  }, [step, steps.length])

  if (placements.length === 0) {
    return (
      <Modal
        open
        onOpenChange={(open) => !open && onClose()}
        title="Add member"
        description={
          unitNodeId
            ? `Add ${deepest?.displayName ?? 'cells'} under this unit first, then return here.`
            : `Add ${deepest?.displayName ?? 'org units'} in Roster first, then return here.`
        }
        size="lg"
      >
        <p className="text-sm text-muted-foreground">
          {unitNodeId
            ? `Add ${deepest?.displayName ?? 'cells'} under this unit first, then return here.`
            : `Add ${deepest?.displayName ?? 'org units'} in Roster first, then return here.`}
        </p>
      </Modal>
    )
  }

  function validateStep(kind: MemberWizardStepKind): boolean {
    setStepError(null)
    if (kind === 'details') {
      if (!name.trim()) {
        setStepError('Enter the member’s full name.')
        return false
      }
      if (emailEntered && !emailLooksValid) {
        setStepError('Enter a valid email address.')
        return false
      }
      if (emailEntered && isEmailAvailabilityBlocking(email, emailAvailability)) {
        setStepError(emailAvailability.message ?? 'This email is already in use.')
        return false
      }
      return true
    }
    if (kind === 'personal') {
      if (!profile.dateOfBirth.trim()) {
        setStepError('Date of birth is required.')
        return false
      }
      return true
    }
    if (kind === 'cell' || kind === 'placement') {
      if (!resolvedParentId) {
        setStepError(`Choose which ${deepest?.displayName.toLowerCase() ?? 'cell'} they belong to.`)
        return false
      }
      return true
    }
    return true
  }

  function goBack() {
    setStepError(null)
    setDirection('back')
    setStep((current) => Math.max(0, current - 1))
  }

  function goNext() {
    if (!validateStep(currentKind)) return

    if (isLastStep) {
      void submit(async () => {
        const profilePayload = memberProfilePayload(profile)
        await api.post('/api/structure/members', {
          name: name.trim(),
          email: email.trim() || null,
          ...profilePayload,
          position,
          parentNodeId: resolvedParentId,
          responsiveness: 3,
        })
        onClose()
      })
      return
    }

    setDirection('forward')
    setStep((current) => current + 1)
  }

  return (
    <TooltipProvider>
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Add member"
      description={steps[step]}
      titleAccessory={<WizardStepper variant="dots" steps={steps} currentStep={step} />}
      size="xl"
    >
      <div className="space-y-5">
        <WizardStepPanel stepKey={`${step}`} direction={direction}>
          {stepError && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {stepError}
            </p>
          )}

          {currentKind === 'details' && (
            <div className="space-y-4">
              {cellLabel && (
                <p className="text-sm text-muted-foreground">
                  Adding to{' '}
                  <span className="font-medium text-foreground">{cellLabel}</span>
                </p>
              )}

              {fellowshipLabel && (
                <p className="text-sm text-muted-foreground">
                  Adding to{' '}
                  <span className="font-medium text-foreground">{fellowshipLabel}</span>
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <WizardField label="Full name" id="member-name" required>
                  <Input
                    id="member-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setStepError(null)
                    }}
                    required
                    autoFocus
                  />
                </WizardField>

                <EmailAvailabilityField
                  id="member-email"
                  email={email}
                  onChange={(value) => {
                    setEmail(value)
                    setStepError(null)
                  }}
                  scope="roster"
                  label="Email"
                  labelExtra={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="About member email"
                        >
                          <CircleHelp className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-left leading-relaxed">
                        Optional for now. Members do not receive a login. You can add an email later
                        for church updates.
                      </TooltipContent>
                    </Tooltip>
                  }
                />
              </div>

              <MemberProfileFields
                phoneId="member-phone"
                churchCountryCode={me.countryCode}
                values={profile}
                onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
                sections={['contact']}
              />
            </div>
          )}

          {currentKind === 'personal' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Birthday is required so the church calendar and age stay in sync.
              </p>
              <MemberProfileFields
                phoneId="member-phone"
                churchCountryCode={me.countryCode}
                values={profile}
                onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
                sections={['personal']}
                requirePhoneAndDob
              />
            </div>
          )}

          {currentKind === 'cell' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {fellowshipLabel
                  ? `Choose which ${deepest?.displayName.toLowerCase() ?? 'cell'} in ${fellowshipLabel} this member belongs to.`
                  : `Choose which ${deepest?.displayName.toLowerCase() ?? 'cell'} this member belongs to.`}
              </p>

              <WizardField
                label={`${deepest?.displayName ?? 'Cell'}`}
                id="member-fellowship-cell"
                required
              >
                <SearchPicker
                  options={placementOptions}
                  value={parentNodeId}
                  onChange={(value) => {
                    setParentNodeId(value)
                    setStepError(null)
                  }}
                  placeholder={`Search ${deepest?.displayName.toLowerCase() ?? 'cells'}…`}
                  emptyMessage="No cells match your search."
                  required
                />
              </WizardField>
            </div>
          )}

          {currentKind === 'placement' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Choose their role and which {deepest?.displayName.toLowerCase() ?? 'unit'} they
                belong to.
              </p>

              <WizardField label="Role" id="member-role">
                <select
                  id="member-role"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as MemberPosition)}
                >
                  {MEMBER_POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField
                label={`Placed under (${deepest?.displayName ?? 'unit'})`}
                id="member-parent"
                required
              >
                <SearchPicker
                  options={placementOptions}
                  value={parentNodeId}
                  onChange={setParentNodeId}
                  placeholder={`Search ${deepest?.displayName.toLowerCase() ?? 'units'}…`}
                  emptyMessage="No roster units match your search."
                  required
                />
              </WizardField>
            </div>
          )}

          {currentKind === 'education' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Optional details about school, work, or training.
              </p>

              <MemberProfileFields
                phoneId="member-phone"
                churchCountryCode={me.countryCode}
                values={profile}
                onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
                sections={['education']}
              />
            </div>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          onCancel={onClose}
          onBack={goBack}
          onNext={goNext}
          isLastStep={isLastStep}
          canProceed={
            currentKind === 'details'
              ? name.trim().length > 0 &&
                emailLooksValid &&
                !(emailEntered && isEmailAvailabilityBlocking(email, emailAvailability))
              : currentKind === 'personal'
                ? profile.dateOfBirth.trim().length > 0
                : currentKind === 'cell' || currentKind === 'placement'
                  ? Boolean(resolvedParentId)
                  : true
          }
          submitLabel="Add member"
          busyLabel="Adding…"
        />
      </div>
    </Modal>
    </TooltipProvider>
  )
}
