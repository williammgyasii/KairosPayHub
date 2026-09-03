import { useMemo, useState } from 'react'
import { Grid3X3, UserRound } from 'lucide-react'
import { useApi } from '@/api/core'
import type { CreateStructureNodeResponse, StructureLayer, StructureTree } from '@/api/structure'
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
  getDeepestLayer,
  formatFellowshipName,
  layerParentOptions,
  layerRequiresParent,
  nextUnitNumberForParent,
  parentLayerForLayer,
  resolveLayerParentId,
} from '@/lib/structure-tree'
import { cn } from '@/lib/utils'

const stepLabels = (cellName: string | undefined) => {
  const base = ['Name & place', 'Fellowship leader'] as const
  if (!cellName) return base
  return [...base, `First ${cellName.toLowerCase()}`] as const
}

export function FellowshipCreateWizard({
  tree,
  unitNodeId = null,
  layer,
  parentNodeId,
  busy,
  submit,
  onClose,
}: {
  tree: StructureTree
  unitNodeId?: string | null
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
  const [cellName, setCellName] = useState('')
  const [leaderIsCellLeader, setLeaderIsCellLeader] = useState(true)
  const [stepError, setStepError] = useState<string | null>(null)

  const parentLayer = parentLayerForLayer(tree, layer)
  const deepest = getDeepestLayer(tree)
  const cellLayer = deepest && deepest.id !== layer.id ? deepest : undefined
  const requiresParent = layerRequiresParent(tree, layer)

  const parentOptions = useMemo(
    () => layerParentOptions(tree, layer, unitNodeId),
    [tree, layer, unitNodeId],
  )

  const resolvedParentId = useMemo(
    () => resolveLayerParentId(parentOptions, selectedParentId || parentNodeId),
    [parentOptions, selectedParentId, parentNodeId],
  )

  const fellowshipNumber = useMemo(
    () => nextUnitNumberForParent(tree, layer.id, resolvedParentId || null),
    [tree, layer.id, resolvedParentId],
  )

  const fellowshipDisplayName = useMemo(
    () => (name.trim() ? formatFellowshipName(name) : ''),
    [name],
  )

  const defaultCellName = fellowshipDisplayName ? `${fellowshipDisplayName} Cell` : ''

  const steps = stepLabels(cellLayer?.displayName)
  const selectedParent = parentOptions.find((option) => option.id === resolvedParentId)
  const progress = ((step + 1) / steps.length) * 100
  const step0Ready = name.trim().length > 0 && (!requiresParent || Boolean(resolvedParentId))
  const leaderEmailAvailability = useEmailAvailability(leaderEmail, 'login')
  const leaderReady =
    leaderName.trim().length > 0 &&
    isRequiredLeaderProfileComplete(leaderEmail, leaderProfile) &&
    !isEmailAvailabilityBlocking(leaderEmail, leaderEmailAvailability)
  const cellReady = leaderIsCellLeader
  const canCreate = cellLayer
    ? leaderReady && cellReady
    : leaderReady

  if (generatedLogin) {
    return (
      <LeaderLoginSuccessModal
        title="Fellowship created"
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
      title="Add fellowship"
      description={`Name the fellowship, add its leader, and create the first ${cellLayer?.displayName.toLowerCase() ?? 'cell'}.`}
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
                    Add a {parentLayer.displayName.toLowerCase()} first, then you can create a
                    fellowship here.
                  </p>
                )}

                {requiresParent && parentOptions.length === 1 && selectedParent && (
                  <p className="text-sm text-muted-foreground">
                    Under{' '}
                    <span className="font-medium text-foreground">{selectedParent.label}</span>
                  </p>
                )}

                {requiresParent && parentOptions.length > 1 && parentLayer && (
                  <WizardField label={`Which ${parentLayer.displayName}?`} id="fellowship-parent" required>
                    <select
                      id="fellowship-parent"
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

                <WizardField label={`${layer.displayName} name`} id="fellowship-name" required>
                  <Input
                    id="fellowship-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setStepError(null)
                    }}
                    placeholder="e.g. Titans or Titans Fellowship"
                    required
                    autoFocus
                  />
                  {fellowshipDisplayName && (
                    <p className="text-xs text-muted-foreground">
                      Will appear as{' '}
                      <span className="font-medium text-foreground">{fellowshipDisplayName}</span>
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
                  description="Register the person who leads this fellowship. They'll receive an email to set their password."
                />

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
              </>
            )}

            {step === 2 && cellLayer && (
              <>
                <WizardIntro
                  icon={Grid3X3}
                  title={`First ${cellLayer.displayName}`}
                  description={`Every ${layer.displayName.toLowerCase()} needs at least one ${cellLayer.displayName.toLowerCase()}. We'll create it under ${fellowshipDisplayName || 'this fellowship'}.`}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <WizardField label={`${cellLayer.displayName} name`} id="cell-name">
                    <Input
                      id="cell-name"
                      value={cellName}
                      onChange={(e) => setCellName(e.target.value)}
                      placeholder={defaultCellName || `e.g. ${cellLayer.displayName} 1`}
                      autoFocus
                    />
                  </WizardField>
                </div>

                <section className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                  <p className="text-sm font-medium">
                    Is {leaderName.trim() || 'the fellowship leader'} the leader of this{' '}
                    {cellLayer.displayName.toLowerCase()}?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: true, label: 'Yes — they lead this cell' },
                        { id: false, label: 'No' },
                      ] as const
                    ).map((option) => (
                      <button
                        key={String(option.id)}
                        type="button"
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          leaderIsCellLeader === option.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                        )}
                        onClick={() => setLeaderIsCellLeader(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {!leaderIsCellLeader && (
                    <div className="rounded-md border border-amber-200/80 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100">
                      The fellowship leader must lead their first {cellLayer.displayName.toLowerCase()}{' '}
                      before they can run the fellowship. Create their cell here first — confirm
                      &ldquo;Yes&rdquo; above to continue.
                    </div>
                  )}

                  {leaderIsCellLeader && (
                    <p className="text-xs text-muted-foreground">
                      {leaderName.trim() || 'The leader'} will be the first member on this{' '}
                      {cellLayer.displayName.toLowerCase()} and its cell leader.
                    </p>
                  )}
                </section>
              </>
            )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          isLastStep={step === steps.length - 1}
          canProceed={
            step === 0
              ? step0Ready
              : step === 1
                ? cellLayer
                  ? leaderReady
                  : canCreate
                : canCreate
          }
          submitLabel="Create fellowship"
          onCancel={onClose}
          onBack={() => {
            setStepError(null)
            setDirection('back')
            setStep((s) => s - 1)
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
                const profile = memberProfilePayload(leaderProfile)
                const resolvedCellName = cellLayer
                  ? cellName.trim() || defaultCellName || null
                  : null
                const response = await api.post<CreateStructureNodeResponse>(
                  '/api/structure/nodes',
                  {
                    layerId: layer.id,
                    parentNodeId: resolvedParentId,
                    name: formatFellowshipName(name),
                    unitNumber: String(fellowshipNumber),
                    newLeader: {
                      name: leaderName,
                      email: leaderEmail.trim(),
                      phone: profile.phone,
                      dateOfBirth: profile.dateOfBirth,
                      residence: profile.residence,
                      occupationStatus: profile.occupationStatus,
                      schoolOrWorkplace: profile.schoolOrWorkplace,
                      initialCellName: resolvedCellName,
                      leaderIsCellLeader: cellLayer ? true : false,
                    },
                  },
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
            setStep((s) => s + 1)
          }}
        />
      </div>
    </Modal>
  )
}
