import { useMemo, useState } from 'react'
import { Grid3X3, UserRound, Users } from 'lucide-react'
import { useApi } from '@/api/useApi'
import type { CreateStructureNodeResponse, StructureLayer, StructureTree } from '@/api/structure'
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
  getDeepestLayer,
  getLayers,
  layerById,
  nextUnitNumberForParent,
  nodeById,
  nodesUnderUnitAtLayer,
} from '@/lib/structure-tree'
import { cn } from '@/lib/utils'

const stepLabels = (layerName: string, cellName: string) =>
  [layerName, 'Leader', cellName] as const

export function FellowshipCreateWizard({
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

  const unit = nodeById(tree, unitNodeId)
  const unitLayer = unit ? layerById(tree, unit.layerId) : undefined
  const parentLayer = getLayers(tree)[layer.sortOrder - 1]
  const deepest = getDeepestLayer(tree)
  const cellLayer = deepest && deepest.id !== layer.id ? deepest : undefined

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

  const effectiveParentId = selectedParentId || parentNodeId
  const fellowshipNumber = useMemo(
    () => nextUnitNumberForParent(tree, layer.id, effectiveParentId || null),
    [tree, layer.id, effectiveParentId],
  )

  const defaultCellName = name.trim() ? `${name.trim()} Cell` : ''
  const cellNumberPreview = '1'

  const steps = stepLabels(layer.displayName, cellLayer?.displayName ?? 'Cell')
  const progress = ((step + 1) / steps.length) * 100
  const leaderReady =
    leaderName.trim().length > 0 &&
    isRequiredLeaderProfileComplete(leaderEmail, leaderProfile)
  const cellReady = leaderIsCellLeader
  const canCreate = leaderReady && cellReady && Boolean(cellLayer)

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
      title="Add fellowship"
      description={`Set up ${layer.displayName.toLowerCase()}, its leader, and first ${cellLayer?.displayName.toLowerCase() ?? 'cell'}.`}
      size="xl"
    >
      <div className="space-y-5">
        <StructureChainFromLabels
          labels={[layer.displayName, 'Leader', cellLayer?.displayName ?? 'Cell']}
          includeChurch={false}
          className="justify-center py-1"
        />

        <WizardStepper steps={steps} currentStep={step} />
        <WizardProgressBar value={progress} />

        <WizardStepPanel stepKey={step} direction={direction}>
            {step === 0 && (
              <>
                <WizardIntro
                  icon={Users}
                  title={`${layer.displayName} details`}
                  description={`Name the new ${layer.displayName.toLowerCase()} under your structure.`}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <WizardField label={`${layer.displayName} name`} id="fellowship-name">
                    <Input
                      id="fellowship-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Titans Fellowship"
                      required
                      autoFocus
                    />
                  </WizardField>
                  <WizardField label={`${layer.displayName} number`} id="fellowship-number">
                    <Input
                      id="fellowship-number"
                      value={String(fellowshipNumber)}
                      readOnly
                      className="bg-muted/40 text-muted-foreground"
                    />
                  </WizardField>
                </div>

                {parentOptions.length > 1 && parentLayer && (
                  <WizardField label={`Parent ${parentLayer.displayName}`} id="fellowship-parent">
                    <select
                      id="fellowship-parent"
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
              </>
            )}

            {step === 1 && (
              <>
                <WizardIntro
                  icon={UserRound}
                  title={`${layer.displayName} leader`}
                  description="Register the person who leads this fellowship. They'll receive login credentials by email."
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
              </>
            )}

            {step === 2 && cellLayer && (
              <>
                <WizardIntro
                  icon={Grid3X3}
                  title={`First ${cellLayer.displayName}`}
                  description={`Every ${layer.displayName.toLowerCase()} needs at least one ${cellLayer.displayName.toLowerCase()}. We'll create it under ${name || 'this fellowship'}.`}
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
                  <WizardField label={`${cellLayer.displayName} number`} id="cell-number">
                    <Input
                      id="cell-number"
                      value={cellNumberPreview}
                      readOnly
                      className="bg-muted/40 text-muted-foreground"
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
              ? Boolean(name.trim())
              : step === 1
                ? leaderReady
                : canCreate
          }
          submitLabel="Create fellowship"
          onCancel={onClose}
          onBack={() => {
            setDirection('back')
            setStep((s) => s - 1)
          }}
          onNext={() => {
            if (step === steps.length - 1) {
              void submit(async () => {
                const profile = memberProfilePayload(leaderProfile)
                const resolvedCellName = cellName.trim() || defaultCellName || null
                const response = await api.post<CreateStructureNodeResponse>(
                  '/api/structure/nodes',
                  {
                    layerId: layer.id,
                    parentNodeId: selectedParentId || parentNodeId,
                    name,
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
                      leaderIsCellLeader: true,
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
