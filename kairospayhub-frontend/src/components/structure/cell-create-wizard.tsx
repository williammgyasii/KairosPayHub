import { useMemo, useState } from 'react'
import { Grid3X3, UserRound } from 'lucide-react'
import { useApi } from '@/api/useApi'
import type { CreateStructureNodeResponse, StructureLayer, StructureTree } from '@/api/structure'
import { buildMemberRows } from '@/lib/structure-table-rows'
import {
  LeaderLoginCredentialsModal,
  type GeneratedLeaderLogin,
} from '@/components/structure/leader-login-credentials-modal'
import {
  MemberProfileFields,
  memberProfilePayload,
  isRequiredLeaderProfileComplete,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
import { SearchPicker } from '@/components/structure/search-picker'
import { StructureChainFromLabels } from '@/components/structure/structure-chain'
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
  getLayers,
  layerById,
  memberBelongsToUnit,
  nextUnitNumberForParent,
  nodeById,
  nodesUnderUnitAtLayer,
} from '@/lib/structure-tree'
import { cn } from '@/lib/utils'

type LeaderMode = 'none' | 'existing' | 'new'

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
  const [selectedParentId, setSelectedParentId] = useState('')
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

  const unit = nodeById(tree, unitNodeId)
  const unitLayer = unit ? layerById(tree, unit.layerId) : undefined
  const parentLayer = layer.sortOrder > 0 ? getLayers(tree)[layer.sortOrder - 1] : undefined

  const parentOptions = useMemo(() => {
    if (!unit || !unitLayer || !parentLayer) return []
    if (layer.sortOrder === unitLayer.sortOrder + 1) {
      return [{ id: unit.id, label: unit.name }]
    }
    return nodesUnderUnitAtLayer(tree, unit.id, parentLayer.id).map((node) => ({
      id: node.id,
      label: node.name,
    }))
  }, [tree, unit, unitLayer, parentLayer, layer.sortOrder])

  const effectiveParentId =
    parentOptions.length === 1
      ? parentOptions[0].id
      : unitLayer && layer.sortOrder === unitLayer.sortOrder + 1
        ? parentNodeId
        : selectedParentId
  const cellNumber = useMemo(
    () => nextUnitNumberForParent(tree, layer.id, effectiveParentId || null),
    [tree, layer.id, effectiveParentId],
  )

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

  const steps = [layer.displayName, 'Leader'] as const
  const progress = ((step + 1) / steps.length) * 100
  const detailsReady =
    name.trim().length > 0 && parentOptions.length > 0 && Boolean(effectiveParentId)
  const newLeaderReady =
    leaderName.trim().length > 0 && isRequiredLeaderProfileComplete(leaderEmail, leaderProfile)
  const leaderStepReady =
    leaderMode === 'none' ||
    (leaderMode === 'existing' && Boolean(leaderMemberId)) ||
    (leaderMode === 'new' && newLeaderReady)
  const canCreate = detailsReady && leaderStepReady

  if (generatedLogin) {
    return (
      <LeaderLoginCredentialsModal
        credentials={generatedLogin}
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
      description={`Create a ${layer.displayName.toLowerCase()} under ${unit?.name ?? 'this unit'}: details first, then leader.`}
      size="xl"
    >
      <div className="space-y-5">
        <StructureChainFromLabels
          labels={[layer.displayName, 'Leader']}
          includeChurch={false}
          includeMember={false}
          className="justify-center py-1"
        />

        <WizardStepper steps={steps} currentStep={step} />
        <WizardProgressBar value={progress} />

        <WizardStepPanel stepKey={step} direction={direction}>
          {step === 0 && (
            <>
              <WizardIntro
                icon={Grid3X3}
                title={`${layer.displayName} details`}
                description={`Name the new ${layer.displayName.toLowerCase()} and choose where it sits in your structure.`}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <WizardField label={`${layer.displayName} name`} id="cell-name" required>
                  <Input
                    id="cell-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`e.g. ${layer.displayName} 1`}
                    required
                    autoFocus
                  />
                </WizardField>
                <WizardField label={`${layer.displayName} number`} id="cell-number">
                  <Input
                    id="cell-number"
                    value={String(cellNumber)}
                    readOnly
                    className="bg-muted/40 text-muted-foreground"
                  />
                </WizardField>
              </div>

              {parentOptions.length === 0 && parentLayer && (
                <p className="rounded-md border border-amber-200/80 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100">
                  Add a {parentLayer.displayName.toLowerCase()} under {unit?.name ?? 'this unit'}{' '}
                  first, then return here to create a {layer.displayName.toLowerCase()}.
                </p>
              )}

              {parentOptions.length > 1 && parentLayer && (
                <WizardField label={`Parent ${parentLayer.displayName}`} id="cell-parent" required>
                  <select
                    id="cell-parent"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    required
                  >
                    <option value="">Select…</option>
                    {parentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </WizardField>
              )}

              {parentLayer && parentOptions.length === 1 && (
                <p className="text-xs text-muted-foreground">
                  Under {parentLayer.displayName}:{' '}
                  <span className="font-medium text-foreground">{parentOptions[0].label}</span>
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <WizardIntro
                icon={UserRound}
                title={`${layer.displayName} leader`}
                description={`Assign who leads this ${layer.displayName.toLowerCase()}. New leaders receive login credentials by email.`}
              />

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'none', label: 'No leader yet' },
                    { id: 'existing', label: 'Pick member', disabled: memberOptions.length === 0 },
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

              {leaderMode === 'existing' && (
                <SearchPicker
                  options={memberOptions}
                  value={leaderMemberId}
                  onChange={setLeaderMemberId}
                  placeholder="Search members by name or placement…"
                  emptyMessage="No members match your search."
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
                    <WizardField label="Leader email" id="leader-email" required>
                      <Input
                        id="leader-email"
                        type="email"
                        value={leaderEmail}
                        onChange={(e) => setLeaderEmail(e.target.value)}
                        placeholder="For login credentials"
                        required
                      />
                    </WizardField>
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

              {leaderMode === 'none' && (
                <p className="text-xs text-muted-foreground">
                  You can assign a leader later from the {layer.displayName.toLowerCase()} edit
                  form.
                </p>
              )}
            </>
          )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          isLastStep={step === steps.length - 1}
          canProceed={step === 0 ? detailsReady : canCreate}
          submitLabel={`Create ${layer.displayName.toLowerCase()}`}
          onCancel={onClose}
          onBack={() => {
            setDirection('back')
            setStep((current) => current - 1)
          }}
          onNext={() => {
            if (step === steps.length - 1) {
              void submit(async () => {
                const payload: Record<string, unknown> = {
                  layerId: layer.id,
                  parentNodeId: effectiveParentId || null,
                  name,
                  unitNumber: String(cellNumber),
                }

                if (leaderMode === 'existing' && leaderMemberId) {
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
