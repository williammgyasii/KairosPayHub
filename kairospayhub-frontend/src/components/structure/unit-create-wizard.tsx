import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useApi } from '@/api/core'
import type { CreateStructureNodeResponse, StructureLayer, StructureTree } from '@/api/structure'
import { buildMemberRows } from '@/lib/structure-table-rows'
import { createOnceLock } from '@/lib/create-once'
import { createUnitPolicy } from '@/lib/create-unit-policy'
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
  memberProfileInitialValues,
  memberProfilePayload,
  isRequiredLeaderProfileComplete,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { SearchPicker } from '@/components/structure/search-picker'
import {
  WizardField,
  WizardFooter,
  WizardStepPanel,
  WizardStepper,
} from '@/components/structure/wizard-shell'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  formatUnitName,
  memberBelongsToUnit,
  nextUnitNumberForParent,
  resolveLayerParentId,
} from '@/lib/structure-tree'
import { cn } from '@/lib/utils'

type LeaderMode = 'existing' | 'new'

export function UnitCreateWizard({
  tree,
  layer,
  scopeUnitId = null,
  busy,
  submit,
  onClose,
  countryCode,
}: {
  tree: StructureTree
  layer: StructureLayer
  scopeUnitId?: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
  countryCode?: string | null
}) {
  const api = useApi()
  const outlet = useOutletContext<DashboardOutletContext | undefined>()
  const churchCountryCode = countryCode ?? outlet?.me?.countryCode
  const policy = useMemo(
    () => createUnitPolicy(tree, layer, scopeUnitId),
    [tree, layer, scopeUnitId],
  )
  const clientRequestId = useMemo(() => crypto.randomUUID(), [])
  const createLock = useRef(createOnceLock())
  const [creating, setCreating] = useState(false)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [generatedLogin, setGeneratedLogin] = useState<GeneratedLeaderLogin | null>(null)
  const [name, setName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState(policy.defaultParentId ?? '')
  const [leaderMode, setLeaderMode] = useState<LeaderMode>('new')
  const [leaderMemberId, setLeaderMemberId] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [leaderEmail, setLeaderEmail] = useState('')
  const [leaderProfile, setLeaderProfile] = useState<MemberProfileFormValues>(() =>
    memberProfileInitialValues({ countryCode: churchCountryCode }),
  )
  const [stepError, setStepError] = useState<string | null>(null)

  const resolvedParentId = useMemo(
    () => resolveLayerParentId(policy.parentOptions, selectedParentId || policy.defaultParentId),
    [policy.parentOptions, policy.defaultParentId, selectedParentId],
  )

  const unitNumber = useMemo(
    () => nextUnitNumberForParent(tree, layer.id, resolvedParentId || null),
    [tree, layer.id, resolvedParentId],
  )

  const unitDisplayName = useMemo(
    () => (name.trim() ? formatUnitName(name, layer.displayName) : ''),
    [name, layer.displayName],
  )

  const memberOptions = useMemo(() => {
    const rows = buildMemberRows(tree).filter((member) =>
      scopeUnitId ? memberBelongsToUnit(tree, scopeUnitId, member.parentNodeId) : true,
    )
    return rows.map((member) => ({
      id: member.id,
      label: member.member,
      hint: member.structure.map((segment) => segment.nodeName).join(' / ') || member.path,
    }))
  }, [tree, scopeUnitId])

  const pickMemberLocked = memberOptions.length === 0

  useEffect(() => {
    if (!policy.includeLeaderStep) {
      setLeaderMode('new')
      setLeaderMemberId('')
      return
    }
    setLeaderMode('new')
    if (memberOptions.length > 0) {
      setLeaderMemberId((current) =>
        memberOptions.some((member) => member.id === current) ? current : memberOptions[0].id,
      )
    } else {
      setLeaderMemberId('')
    }
  }, [policy.includeLeaderStep, memberOptions])

  const steps = [
    'Name & place',
    ...(policy.includeLeaderStep ? [`${policy.labels.layerName} leader`] : []),
  ]
  const selectedParent = policy.parentOptions.find((option) => option.id === resolvedParentId)
  const step0Ready =
    name.trim().length > 0 && (!policy.parentRequired || Boolean(resolvedParentId))
  const leaderEmailAvailability = useEmailAvailability(
    leaderEmail,
    'login',
    policy.includeLeaderStep && leaderMode === 'new',
  )
  const newLeaderReady =
    leaderName.trim().length > 0 &&
    isRequiredLeaderProfileComplete(leaderEmail, leaderProfile, churchCountryCode) &&
    !isEmailAvailabilityBlocking(leaderEmail, leaderEmailAvailability)
  const leaderStepReady =
    (leaderMode === 'existing' && Boolean(leaderMemberId)) ||
    (leaderMode === 'new' && newLeaderReady)
  const canCreate = policy.includeLeaderStep ? leaderStepReady : step0Ready

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

  const layerPhrase = policy.labels.layerName.toLowerCase()

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={policy.labels.title}
      description={steps[step]}
      titleAccessory={<WizardStepper variant="dots" steps={steps} currentStep={step} />}
      size="xl"
    >
      <div data-testid="unit-create-wizard" className="space-y-5">
        <WizardStepPanel stepKey={step} direction={direction} className="min-h-[260px]">
          {stepError && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {stepError}
            </p>
          )}

          {step === 0 && (
            <div className="space-y-4">
              {policy.parentRequired && policy.parentOptions.length === 0 && policy.labels.parentLayerName && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Add a {policy.labels.parentLayerName.toLowerCase()} first, then you can create a{' '}
                  {layerPhrase} here.
                </p>
              )}

              {policy.parentRequired && policy.parentOptions.length === 1 && selectedParent && (
                <p className="text-sm text-muted-foreground">
                  Under{' '}
                  <span className="font-medium text-foreground">{selectedParent.label}</span>
                </p>
              )}

              {policy.parentRequired && policy.parentOptions.length > 1 && policy.labels.parentLayerName && (
                <WizardField
                  label={`Which ${policy.labels.parentLayerName}?`}
                  id="unit-parent"
                  required
                >
                  <select
                    id="unit-parent"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={resolvedParentId ?? ''}
                    onChange={(e) => {
                      setSelectedParentId(e.target.value)
                      setStepError(null)
                    }}
                    required
                  >
                    {policy.parentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </WizardField>
              )}

              <WizardField label={`${layer.displayName} name`} id="unit-name" required>
                <Input
                  id="unit-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setStepError(null)
                  }}
                  placeholder={`e.g. Titans or Titans ${layer.displayName}`}
                  required
                  autoFocus
                />
                {unitDisplayName && (
                  <p className="text-xs text-muted-foreground">
                    Will appear as{' '}
                    <span className="font-medium text-foreground">{unitDisplayName}</span>
                  </p>
                )}
              </WizardField>
            </div>
          )}

          {step === 1 && policy.includeLeaderStep && (
            <>
              <p className="text-xs text-muted-foreground">
                Assign who leads this {layerPhrase}. New leaders receive an email to set their
                password.
              </p>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      id: 'existing' as const,
                      label: 'Pick member',
                      disabled: pickMemberLocked,
                    },
                    { id: 'new' as const, label: 'New person' },
                  ]
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={option.disabled}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      leaderMode === option.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      option.disabled && 'opacity-40',
                    )}
                    onClick={() => setLeaderMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {pickMemberLocked && (
                <p className="text-xs text-muted-foreground">
                  No members to pick yet. Add a new person instead.
                </p>
              )}

              {leaderMode === 'existing' && (
                <SearchPicker
                  options={memberOptions}
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
                    onChange={(patch) =>
                      setLeaderProfile((current) => ({ ...current, ...patch }))
                    }
                    churchCountryCode={churchCountryCode}
                    requirePhoneAndDob
                  />
                  <p className="text-xs text-muted-foreground">
                    {leaderName.trim() || 'The leader'} will be placed on this {layerPhrase} as
                    its leader and first member.
                  </p>
                </>
              )}
            </>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy || creating}
          isLastStep={step === steps.length - 1}
          canProceed={step === 0 ? step0Ready : canCreate}
          submitLabel={policy.labels.submitLabel}
          onCancel={onClose}
          onBack={() => {
            setStepError(null)
            setDirection('back')
            setStep((current) => current - 1)
          }}
          onNext={() => {
            if (step === 0 && policy.parentRequired && !resolvedParentId) {
              setStepError(
                policy.labels.parentLayerName
                  ? `Add a ${policy.labels.parentLayerName.toLowerCase()} first, or pick one above.`
                  : 'Add a parent unit in your structure first.',
              )
              return
            }

            setStepError(null)

            if (step === steps.length - 1) {
              if (!createLock.current.tryStart()) return
              setCreating(true)
              void submit(async () => {
                const payload: Record<string, unknown> = {
                  layerId: layer.id,
                  parentNodeId: resolvedParentId,
                  name: formatUnitName(name, layer.displayName),
                  unitNumber: String(unitNumber),
                  clientRequestId,
                }

                if (policy.includeLeaderStep && leaderMode === 'existing' && leaderMemberId) {
                  payload.leaderMemberId = leaderMemberId
                } else if (policy.includeLeaderStep && leaderMode === 'new') {
                  const profile = memberProfilePayload(leaderProfile)
                  payload.newLeader = {
                    name: leaderName,
                    email: leaderEmail.trim(),
                    phone: profile.phone,
                    dateOfBirth: profile.dateOfBirth,
                    residence: profile.residence,
                    state: profile.state,
                    occupationStatus: profile.occupationStatus,
                    schoolOrWorkplace: profile.schoolOrWorkplace,
                    workplace: profile.workplace,
                  }
                }

                try {
                  const response = await api.post<CreateStructureNodeResponse>(
                    '/api/structure/nodes',
                    payload,
                  )
                  if (response.generatedLeaderLogin) {
                    setGeneratedLogin(response.generatedLeaderLogin)
                  } else {
                    onClose()
                  }
                } catch (err) {
                  createLock.current.reset()
                  setCreating(false)
                  throw err
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
