import { useEffect, useMemo, useState } from 'react'
import { CircleHelp, GraduationCap, GitBranch, Grid3X3, UserRound } from 'lucide-react'
import { useApi } from '@/api/core'
import {
  MEMBER_POSITION_OPTIONS,
  type MemberPosition,
  type StructureTree,
} from '@/api/structure'
import {
  MemberProfileFields,
  memberProfileInitialValues,
  memberProfilePayload,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
import {
  buildEditStepPlan,
  type MemberWizardMode,
  type MemberWizardStepKind,
} from '@/components/structure/member-wizard-steps'
import { SearchPicker } from '@/components/structure/search-picker'
import {
  WizardField,
  WizardFooter,
  WizardIntro,
  WizardProgressBar,
  WizardStepPanel,
  WizardStepper,
} from '@/components/structure/wizard-shell'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MEMBER_RESPONSIVENESS_OPTIONS } from '@/lib/member-responsiveness'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import {
  formatCellName,
  formatFellowshipName,
  getDeepestLayer,
  layerById,
  nodeById,
  placementOptionsForUnit,
  memberPlacementOptions,
} from '@/lib/structure-tree'

export function MemberEditWizard({
  tree,
  unitNodeId,
  member,
  busy,
  submit,
  onClose,
}: {
  tree: StructureTree
  unitNodeId?: string
  member: StructureMemberRow
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
}) {
  const api = useApi()
  const deepest = getDeepestLayer(tree)
  const unit = unitNodeId ? nodeById(tree, unitNodeId) : undefined
  const layer = unit ? layerById(tree, unit.layerId) : undefined
  const isCellContext = Boolean(unit && deepest && unit.layerId === deepest.id)
  const isFellowshipContext = layer?.standardType === 'Fellowship'
  const wizardMode: MemberWizardMode = isCellContext
    ? 'cell'
    : isFellowshipContext
      ? 'fellowship'
      : 'roster'
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

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [stepError, setStepError] = useState<string | null>(null)
  const [name, setName] = useState(member.member)
  const [email] = useState(member.email ?? '')
  const [profile, setProfile] = useState<MemberProfileFormValues>(() =>
    memberProfileInitialValues(member),
  )
  const [position, setPosition] = useState<MemberPosition>(member.position ?? 'Member')
  const [responsiveness, setResponsiveness] = useState(member.responsiveness ?? 3)
  const [parentNodeId, setParentNodeId] = useState(member.parentNodeId)

  const needsCellStep = isFellowshipContext && placements.length > 1

  const resolvedParentId = useMemo(() => {
    if (wizardMode === 'cell') return member.parentNodeId
    if (isFellowshipContext && placements.length === 1) {
      return placements[0]?.id ?? member.parentNodeId
    }
    return parentNodeId || member.parentNodeId
  }, [wizardMode, isFellowshipContext, placements, parentNodeId, member.parentNodeId])

  const stepPlan = useMemo(
    () => buildEditStepPlan(wizardMode, needsCellStep),
    [wizardMode, needsCellStep],
  )
  const steps = stepPlan.labels
  const stepKinds = stepPlan.kinds
  const currentKind = stepKinds[step] ?? 'details'
  const progress = ((step + 1) / steps.length) * 100
  const isLastStep = step === steps.length - 1

  useEffect(() => {
    setStep(0)
    setName(member.member)
    setProfile(memberProfileInitialValues(member))
    setPosition(member.position ?? 'Member')
    setResponsiveness(member.responsiveness ?? 3)
    setParentNodeId(member.parentNodeId)
    setStepError(null)
  }, [member])

  useEffect(() => {
    if (step >= steps.length) {
      setStep(Math.max(0, steps.length - 1))
    }
  }, [step, steps.length])

  function validateStep(kind: MemberWizardStepKind): boolean {
    setStepError(null)
    if (kind === 'details') {
      if (!name.trim()) {
        setStepError('Enter the member’s full name.')
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
        await api.patch(`/api/structure/members/${member.id}`, {
          name: name.trim(),
          ...profilePayload,
          position,
          parentNodeId: resolvedParentId,
          responsiveness,
        })
        onClose()
      })
      return
    }

    setDirection('forward')
    setStep((current) => current + 1)
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Edit member"
      description={
        cellLabel
          ? `Update ${name.trim() || 'this member'} in ${cellLabel}.`
          : fellowshipLabel
            ? `Update ${name.trim() || 'this member'} in ${fellowshipLabel}.`
            : 'Update profile details or move this person to another roster unit.'
      }
      size="xl"
    >
      <div className="space-y-5">
        <WizardStepper steps={steps} currentStep={step} />
        <WizardProgressBar value={progress} />

        <WizardStepPanel stepKey={step} direction={direction}>
          {stepError && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {stepError}
            </p>
          )}

          {currentKind === 'details' && (
            <div className="space-y-4">
              {cellLabel && (
                <p className="text-sm text-muted-foreground">
                  Member of{' '}
                  <span className="font-medium text-foreground">{cellLabel}</span>
                </p>
              )}

              {fellowshipLabel && (
                <p className="text-sm text-muted-foreground">
                  Member under{' '}
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

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="member-email" className="text-xs font-medium">
                      Email
                    </label>
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
                        {email
                          ? 'Email is used for newsletters and church updates. Login emails are managed separately for leaders.'
                          : 'No email on file. Add one when creating a new member.'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="member-email"
                    type="email"
                    value={email}
                    readOnly
                    className="bg-muted/40 text-muted-foreground"
                  />
                </div>
              </div>

              <MemberProfileFields
                phoneId="member-phone"
                values={profile}
                onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
                sections={['contact', 'personal']}
              />
            </div>
          )}

          {currentKind === 'cell' && (
            <div className="space-y-4">
              <WizardIntro
                icon={Grid3X3}
                title="Attach to cell"
                description={
                  fellowshipLabel
                    ? `Move this member to a different ${deepest?.displayName.toLowerCase() ?? 'cell'} in ${fellowshipLabel}.`
                    : `Choose which ${deepest?.displayName.toLowerCase() ?? 'cell'} this member belongs to.`
                }
              />

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
              <WizardIntro
                icon={GitBranch}
                title="Role & placement"
                description={`Update their role and which ${deepest?.displayName.toLowerCase() ?? 'unit'} they belong to.`}
              />

              <div className="grid gap-4 sm:grid-cols-2">
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

                <WizardField label="Responsiveness" id="member-responsiveness">
                  <select
                    id="member-responsiveness"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={responsiveness}
                    onChange={(e) => setResponsiveness(Number(e.target.value))}
                  >
                    {MEMBER_RESPONSIVENESS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} — {option.label}
                      </option>
                    ))}
                  </select>
                </WizardField>
              </div>

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

          {currentKind === 'responsiveness' && (
            <div className="space-y-4">
              <WizardIntro
                icon={UserRound}
                title="Responsiveness"
                description="How responsive is this member to follow-up and outreach?"
              />

              <WizardField label="Responsiveness level" id="member-responsiveness-edit" required>
                <select
                  id="member-responsiveness-edit"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={responsiveness}
                  onChange={(e) => setResponsiveness(Number(e.target.value))}
                >
                  {MEMBER_RESPONSIVENESS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} — {option.label}
                    </option>
                  ))}
                </select>
              </WizardField>
            </div>
          )}

          {currentKind === 'education' && (
            <div className="space-y-4">
              <WizardIntro
                icon={GraduationCap}
                title="Work & study"
                description="Optional details about school, work, or training."
              />

              <MemberProfileFields
                phoneId="member-phone"
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
              ? name.trim().length > 0
              : currentKind === 'cell' || currentKind === 'placement'
                ? Boolean(resolvedParentId)
                : true
          }
          submitLabel="Save changes"
          busyLabel="Saving…"
        />
      </div>
    </Modal>
  )
}
