import { useMemo, useState } from 'react'
import { Layers, UserRound } from 'lucide-react'
import { useApi } from '@/api/useApi'
import {
  MEMBER_POSITION_OPTIONS,
  type MemberPosition,
  type StructureTree,
} from '@/api/structure'
import {
  MemberProfileFields,
  memberProfilePayload,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DEFAULT_PHONE_COUNTRY } from '@/lib/phone-countries'
import {
  displayUnitNumber,
  getDeepestLayer,
  getLayers,
  memberPlacementNodesForLayer,
  memberPlacementOptions,
} from '@/lib/structure-tree'

export function MemberCreateWizard({
  tree,
  busy,
  submit,
  onClose,
}: {
  tree: StructureTree
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
}) {
  const api = useApi()
  const layers = getLayers(tree)
  const deepest = getDeepestLayer(tree)
  const stepLabels = useMemo(
    () => ['Member details', ...layers.map((layer) => layer.displayName)],
    [layers],
  )
  const totalSteps = stepLabels.length

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState<MemberPosition>('Member')
  const [profile, setProfile] = useState<MemberProfileFormValues>({
    phoneDialCode: DEFAULT_PHONE_COUNTRY.dialCode,
    phoneLocal: '',
    dateOfBirth: '',
    residence: '',
    occupationStatus: '',
    schoolOrWorkplace: '',
  })
  const [selections, setSelections] = useState<Record<string, string>>({})

  const hasPlacementTargets = memberPlacementOptions(tree).length > 0

  const currentLayer = step > 0 ? layers[step - 1] : undefined
  const parentLayer = step > 1 ? layers[step - 2] : undefined
  const parentNodeId = parentLayer ? selections[parentLayer.id] ?? null : null

  const layerOptions = useMemo(() => {
    if (!currentLayer) return []
    return memberPlacementNodesForLayer(tree, currentLayer.id, parentNodeId).map((node) => {
      const unitNumber = displayUnitNumber(tree, node.id)
      return {
        id: node.id,
        label: node.name,
        hint: unitNumber ? `#${unitNumber}` : undefined,
      }
    })
  }, [tree, currentLayer, parentNodeId])

  const selectedParentNodeId = deepest ? selections[deepest.id] ?? '' : ''
  const progress = totalSteps > 0 ? ((step + 1) / totalSteps) * 100 : 0
  const detailsReady = name.trim().length > 0
  const layerStepReady = Boolean(currentLayer && selections[currentLayer.id])
  const canCreate = detailsReady && Boolean(selectedParentNodeId)

  if (!hasPlacementTargets) {
    return (
      <Modal
        open
        onOpenChange={(open) => !open && onClose()}
        title="Add member"
        description="Register someone in your church roster."
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add {deepest?.displayName ?? 'org units'} in Roster first, then return here.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Add member"
      description="Register profile details, then place the person in your structure."
      size="xl"
    >
      <div className="space-y-5">
        <StructureChainFromLabels
          labels={['Details', ...layers.map((layer) => layer.displayName)]}
          includeMember
          includeChurch={false}
          className="justify-center py-1"
        />

        <WizardStepper steps={stepLabels} currentStep={step} />
        <WizardProgressBar value={progress} />

        <WizardStepPanel stepKey={step} direction={direction}>
            {step === 0 && (
              <>
                <WizardIntro
                  icon={UserRound}
                  title="Member details"
                  description="Basic profile for the person you're registering."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <WizardField label="Full name" id="member-name" required>
                    <Input
                      id="member-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </WizardField>
                  <WizardField label="Email" id="member-email">
                    <Input
                      id="member-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Optional"
                    />
                  </WizardField>
                  <WizardField label="Role" id="member-role" className="sm:col-span-2 sm:max-w-xs">
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
                </div>

                <MemberProfileFields
                  phoneId="member-phone"
                  values={profile}
                  onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
                />
              </>
            )}

            {step > 0 && currentLayer && (
              <>
                <WizardIntro
                  icon={Layers}
                  title={`Choose ${currentLayer.displayName}`}
                  description={
                    parentLayer && parentNodeId
                      ? `Pick the ${currentLayer.displayName.toLowerCase()} under your selected ${parentLayer.displayName.toLowerCase()}.`
                      : `Pick the ${currentLayer.displayName.toLowerCase()} this member belongs to.`
                  }
                />

                {parentLayer && !parentNodeId && (
                  <p className="rounded-md border border-amber-200/80 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100">
                    Select a {parentLayer.displayName.toLowerCase()} on the previous step first.
                  </p>
                )}

                {parentNodeId && layerOptions.length === 0 && (
                  <p className="rounded-md border border-amber-200/80 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100">
                    No {currentLayer.displayName.toLowerCase()} units exist under that{' '}
                    {parentLayer?.displayName.toLowerCase() ?? 'parent'}. Add them in Roster first.
                  </p>
                )}

                {layerOptions.length > 0 && (
                  <WizardField label={currentLayer.displayName} id={`member-layer-${currentLayer.id}`}>
                    <SearchPicker
                      options={layerOptions}
                      value={selections[currentLayer.id] ?? ''}
                      onChange={(nodeId) => {
                        setSelections((current) => {
                          const next = { ...current, [currentLayer.id]: nodeId }
                          const layerIndex = layers.findIndex((layer) => layer.id === currentLayer.id)
                          for (let index = layerIndex + 1; index < layers.length; index += 1) {
                            delete next[layers[index].id]
                          }
                          return next
                        })
                      }}
                      placeholder={`Search ${currentLayer.displayName.toLowerCase()}…`}
                      emptyMessage={`No ${currentLayer.displayName.toLowerCase()} matches your search.`}
                      required
                    />
                  </WizardField>
                )}
              </>
            )}
        </WizardStepPanel>

        <WizardFooter
          step={step}
          busy={busy}
          isLastStep={step === totalSteps - 1}
          canProceed={
            step === totalSteps - 1 ? canCreate : step === 0 ? detailsReady : layerStepReady
          }
          submitLabel="Add member"
          onCancel={onClose}
          onBack={() => {
            setDirection('back')
            setStep((current) => current - 1)
          }}
          onNext={() => {
            if (step === totalSteps - 1) {
              void submit(async () => {
                const profilePayload = memberProfilePayload(profile)
                await api.post('/api/structure/members', {
                  name,
                  email: email.trim() || null,
                  ...profilePayload,
                  position,
                  parentNodeId: selectedParentNodeId,
                })
                onClose()
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
