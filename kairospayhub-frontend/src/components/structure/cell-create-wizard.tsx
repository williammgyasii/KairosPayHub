import { useEffect, useMemo, useState } from 'react'
import { UserRound } from 'lucide-react'
import { useApi } from '@/api/core'
import type { CreateStructureNodeResponse, StructureLayer, StructureTree } from '@/api/structure'
import { buildMemberRows } from '@/lib/structure-table-rows'
import {
  LeaderLoginSuccessModal,
  type GeneratedLeaderLogin,
} from '@/components/structure/leader-login-credentials-modal'
import {
  EmailAvailabilityField,
  isEmailAvailabilityBlocking,
  useEmailAvailability,
} from '@/components/structure/email-availability-field'
import {
  MemberProfileFields,
  memberProfilePayload,
  isRequiredLeaderProfileComplete,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
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
import { DEFAULT_PHONE_COUNTRY } from '@/lib/phone-countries'
import {
  formatCellName,
  layerById,
  layerParentOptions,
  layerRequiresParent,
  memberBelongsToUnit,
  nextUnitNumberForParent,
  nodeById,
  nodesUnderUnitAtLayer,
  parentLayerForLayer,
  resolveLayerParentId,
  resolveNodeLeader,
} from '@/lib/structure-tree'
import { cn } from '@/lib/utils'

type LeaderMode = 'existing' | 'new'

const stepLabels = (layerName: string) => ['Name & place', `${layerName} leader`] as const

export function CellCreateWizard({
  tree,
  unitNodeId,
  layer,
  parentNodeId,
  busy,
  submit,
  onClose,
}: {
  tree: StructureTree
  unitNodeId: string
  layer: StructureLayer
  parentNodeId: string
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
}) {
  const api = useApi()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [generatedLogin, setGeneratedLogin] = useState<GeneratedLeaderLogin | null>(null)

  const [name, setName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState(parentNodeId)
  const [leaderMode, setLeaderMode] = useState<LeaderMode>('new')
  const [leaderMemberId, setLeaderMemberId] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [leaderEmail, setLeaderEmail] = useState('')
  const [leaderProfile, setLeaderProfile] = useState<MemberProfileFormValues>({
    phoneDialCode: DEFAULT_PHONE_COUNTRY.dialCode,
    phoneLocal: '',
    dateOfBirth: '',
    residence: '',
    occupationStatus: '',
    schoolOrWorkplace: '',
  })
  const [stepError, setStepError] = useState<string | null>(null)

  const parentLayer = parentLayerForLayer(tree, layer)
  const requiresParent = layerRequiresParent(tree, layer)

  const parentOptions = useMemo(
    () => layerParentOptions(tree, layer, unitNodeId),
    [tree, layer, unitNodeId],
  )

  const resolvedParentId = useMemo(
    () => resolveLayerParentId(parentOptions, selectedParentId || parentNodeId),
    [parentOptions, selectedParentId, parentNodeId],
  )

  const cellNumber = useMemo(
    () => nextUnitNumberForParent(tree, layer.id, resolvedParentId || null),
    [tree, layer.id, resolvedParentId],
  )

  const cellDisplayName = useMemo(() => (name.trim() ? formatCellName(name) : ''), [name])

  const fellowshipLeader = useMemo(() => {
    if (!resolvedParentId) return { leaderMemberId: '', leaderName: '' }
    const parentNode = nodeById(tree, resolvedParentId)
    const parentLayer = parentNode ? layerById(tree, parentNode.layerId) : undefined
    if (parentLayer?.standardType !== 'Fellowship') {
      return { leaderMemberId: '', leaderName: '' }
    }
    return resolveNodeLeader(tree, resolvedParentId)
  }, [tree, resolvedParentId])

  const isFirstCellUnderFellowship = useMemo(() => {
    if (!resolvedParentId) return false
    const parentNode = nodeById(tree, resolvedParentId)
    const parentLayer = parentNode ? layerById(tree, parentNode.layerId) : undefined
    if (parentLayer?.standardType !== 'Fellowship') return false
    return nodesUnderUnitAtLayer(tree, resolvedParentId, layer.id).length === 0
  }, [tree, resolvedParentId, layer.id])

  const assignFellowshipLeaderOnly =
    isFirstCellUnderFellowship && Boolean(fellowshipLeader.leaderMemberId)

  const memberOptions = useMemo(
    () =>
      buildMemberRows(tree)
        .filter((member) => memberBelongsToUnit(tree, unitNodeId, member.parentNodeId))
        .map((member) => ({
          id: member.id,
          label: member.member,
          hint: member.structure.map((segment) => segment.nodeName).join(' / ') || member.path,
        })),
    [tree, unitNodeId],
  )

  const pickableMemberOptions = useMemo(() => {
    if (!fellowshipLeader.leaderMemberId) return memberOptions
    return memberOptions.filter((member) => member.id !== fellowshipLeader.leaderMemberId)
  }, [memberOptions, fellowshipLeader.leaderMemberId])

  const pickMemberLocked = !assignFellowshipLeaderOnly && pickableMemberOptions.length === 0

  useEffect(() => {
    if (assignFellowshipLeaderOnly) {
      setLeaderMode('existing')
      setLeaderMemberId(fellowshipLeader.leaderMemberId)
      return
    }
    if (pickableMemberOptions.length > 0) {
      setLeaderMode('existing')
      setLeaderMemberId((current) =>
        pickableMemberOptions.some((member) => member.id === current)
          ? current
          : pickableMemberOptions[0].id,
      )
      return
    }
    setLeaderMode('new')
    setLeaderMemberId('')
  }, [
    assignFellowshipLeaderOnly,
    fellowshipLeader.leaderMemberId,
    pickableMemberOptions,
  ])

  const steps = stepLabels(layer.displayName)
  const selectedParent = parentOptions.find((option) => option.id === resolvedParentId)
  const progress = ((step + 1) / steps.length) * 100
  const step0Ready = name.trim().length > 0 && (!requiresParent || Boolean(resolvedParentId))
  const leaderEmailAvailability = useEmailAvailability(
    leaderEmail,
    'login',
    leaderMode === 'new' && !assignFellowshipLeaderOnly,
  )
  const newLeaderReady =
    leaderName.trim().length > 0 &&
    isRequiredLeaderProfileComplete(leaderEmail, leaderProfile) &&
    !isEmailAvailabilityBlocking(leaderEmail, leaderEmailAvailability)
  const leaderStepReady =
    assignFellowshipLeaderOnly ||
    (leaderMode === 'existing' && Boolean(leaderMemberId)) ||
    (leaderMode === 'new' && newLeaderReady)

  if (generatedLogin) {
    return (
      <LeaderLoginSuccessModal
        title={`${layer.displayName} created`}
        leaderEmail={generatedLogin.email}
        leaderName={leaderName}
        onClose={onClose}
      />
    )
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Add ${layer.displayName.toLowerCase()}`}
      description={`Name the ${layer.displayName.toLowerCase()}, choose where it sits, and assign its leader.`}
      size="xl"
    >
      <div className="space-y-5">
        <WizardStepper steps={steps} currentStep={step} />
        <WizardProgressBar value={progress} />

        <WizardStepPanel stepKey={step} direction={direction} className="min-h-[260px]">
          {stepError && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {stepError}
            </p>
          )}

          {step === 0 && (
            <div className="space-y-4">
              {requiresParent && parentOptions.length === 0 && parentLayer && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Add a {parentLayer.displayName.toLowerCase()} first, then you can create a{' '}
                  {layer.displayName.toLowerCase()} here.
                </p>
              )}

              {requiresParent && parentOptions.length === 1 && selectedParent && (
                <p className="text-sm text-muted-foreground">
                  Under{' '}
                  <span className="font-medium text-foreground">{selectedParent.label}</span>
                </p>
              )}

              {requiresParent && parentOptions.length > 1 && parentLayer && (
                <WizardField label={`Which ${parentLayer.displayName}?`} id="cell-parent" required>
                  <select
                    id="cell-parent"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={resolvedParentId ?? ''}
                    onChange={(e) => {
                      setSelectedParentId(e.target.value)
                      setStepError(null)
                    }}
                    required
                  >
                    {parentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </WizardField>
              )}

              <WizardField label={`${layer.displayName} name`} id="cell-name" required>
                <Input
                  id="cell-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setStepError(null)
                  }}
                  placeholder={`e.g. Titans or Titans ${layer.displayName}`}
                  required
                  autoFocus
                />
                {cellDisplayName && (
                  <p className="text-xs text-muted-foreground">
                    Will appear as{' '}
                    <span className="font-medium text-foreground">{cellDisplayName}</span>
                  </p>
                )}
              </WizardField>
            </div>
          )}

          {step === 1 && (
            <>
              <WizardIntro
                icon={UserRound}
                title={`${layer.displayName} leader`}
                description={
                  assignFellowshipLeaderOnly
                    ? `This is the first cell under this fellowship. ${fellowshipLeader.leaderName} will lead it.`
                    : `Assign who leads this ${layer.displayName.toLowerCase()}. New leaders receive an email to set their password.`
                }
              />

              {assignFellowshipLeaderOnly ? (
                <section className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                  <p className="text-sm font-medium">{fellowshipLeader.leaderName}</p>
                  <p className="text-sm text-muted-foreground">
                    As fellowship leader, they must lead their first cell before running the
                    fellowship. They&apos;ll be placed on this {layer.displayName.toLowerCase()} as
                    its leader and first member.
                  </p>
                </section>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        {
                          id: 'existing',
                          label: 'Pick member',
                          disabled: pickMemberLocked,
                        },
                        { id: 'new', label: 'New person' },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={'disabled' in option && option.disabled}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          leaderMode === option.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                          'disabled' in option && option.disabled && 'opacity-40',
                        )}
                        onClick={() => setLeaderMode(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {pickMemberLocked && fellowshipLeader.leaderName && (
                    <p className="text-xs text-muted-foreground">
                      Pick member is unavailable — the fellowship leader (
                      {fellowshipLeader.leaderName}) already leads a cell. Add a new person instead.
                    </p>
                  )}

                  {leaderMode === 'existing' && (
                    <SearchPicker
                      options={pickableMemberOptions}
                      value={leaderMemberId}
                      onChange={setLeaderMemberId}
                      placeholder="Search members by name or placement…"
                      emptyMessage="No eligible members match your search."
                      required
                    />
                  )}

                  {leaderMode === 'new' && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <WizardField label="Leader name" id="leader-name" required>
                          <Input
                            id="leader-name"
                            value={leaderName}
                            onChange={(e) => setLeaderName(e.target.value)}
                            required
                            autoFocus
                          />
                        </WizardField>
                        <EmailAvailabilityField
                          id="leader-email"
                          email={leaderEmail}
                          onChange={setLeaderEmail}
                          scope="login"
                          required
                          label="Leader email"
                          placeholder="For their login invite"
                        />
                      </div>

                      <MemberProfileFields
                        phoneId="leader-phone"
                        values={leaderProfile}
                        onChange={(patch) => setLeaderProfile((current) => ({ ...current, ...patch }))}
                        requirePhoneAndDob
                      />

                      <p className="text-xs text-muted-foreground">
                        {leaderName.trim() || 'The leader'} will be placed on this{' '}
                        {layer.displayName.toLowerCase()} as its leader and first member.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          isLastStep={step === steps.length - 1}
          canProceed={step === 0 ? step0Ready : leaderStepReady}
          submitLabel={`Create ${layer.displayName.toLowerCase()}`}
          onCancel={onClose}
          onBack={() => {
            setStepError(null)
            setDirection('back')
            setStep((current) => current - 1)
          }}
          onNext={() => {
            if (step === 0 && requiresParent && !resolvedParentId) {
              setStepError(
                parentLayer
                  ? `Add a ${parentLayer.displayName.toLowerCase()} first, or pick one above.`
                  : 'Add a parent unit in your structure first.',
              )
              return
            }

            setStepError(null)

            if (step === steps.length - 1) {
              void submit(async () => {
                const payload: Record<string, unknown> = {
                  layerId: layer.id,
                  parentNodeId: resolvedParentId,
                  name: formatCellName(name),
                  unitNumber: String(cellNumber),
                }

                if (assignFellowshipLeaderOnly) {
                  payload.leaderMemberId = fellowshipLeader.leaderMemberId
                } else if (leaderMode === 'existing' && leaderMemberId) {
                  payload.leaderMemberId = leaderMemberId
                } else if (leaderMode === 'new') {
                  const profile = memberProfilePayload(leaderProfile)
                  payload.newLeader = {
                    name: leaderName,
                    email: leaderEmail.trim(),
                    phone: profile.phone,
                    dateOfBirth: profile.dateOfBirth,
                    residence: profile.residence,
                    occupationStatus: profile.occupationStatus,
                    schoolOrWorkplace: profile.schoolOrWorkplace,
                    leaderIsCellLeader: true,
                  }
                }

                const response = await api.post<CreateStructureNodeResponse>(
                  '/api/structure/nodes',
                  payload,
                )
                if (response.generatedLeaderLogin) {
                  setGeneratedLogin(response.generatedLeaderLogin)
                } else {
                  onClose()
                }
              })
              return
            }
            setDirection('forward')
            setStep((current) => current + 1)
          }}
        />
      </div>
    </Modal>
  )
}
