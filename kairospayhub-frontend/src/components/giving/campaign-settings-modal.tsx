import { useEffect, useMemo, useState } from 'react'
import type { ApiClient } from '@/api/core'
import type { GivingProgram } from '@/api/giving'
import { updateProgramSettings } from '@/api/giving'
import { receiveGivingsOnMainPolicy } from '@/lib/receive-givings-on-main-policy'
import { WizardField, WizardFooter } from '@/components/structure/wizard-shell'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type CampaignSettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  program: GivingProgram
  children: GivingProgram[]
  api: ApiClient
  onSaved: () => void
}

type MigrateMode = 'pick' | 'create'

export function CampaignSettingsModal({
  open,
  onOpenChange,
  program,
  children,
  api,
  onSaved,
}: CampaignSettingsModalProps) {
  const isRoot = !program.parentProgramId
  const initialReceive = program.receiveGivingsOnMain ?? true
  const [receiveOnMain, setReceiveOnMain] = useState(initialReceive)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [migrateMode, setMigrateMode] = useState<MigrateMode>('pick')
  const [moveToProgramId, setMoveToProgramId] = useState('')
  const [newSubTitle, setNewSubTitle] = useState('')
  const [newSubEventDate, setNewSubEventDate] = useState('')

  const receivePolicy = receiveGivingsOnMainPolicy({
    receiveGivingsOnMain: receiveOnMain,
    isRoot: true,
    acceptsContributions: program.acceptsContributions,
  })

  const turningOff = initialReceive && !receiveOnMain
  const hasDirects = program.directContributionCount > 0
  const needsMigrate = turningOff && hasDirects

  const childOptions = useMemo(() => children, [children])

  useEffect(() => {
    if (!open) return
    setReceiveOnMain(program.receiveGivingsOnMain ?? true)
    setError(null)
    setBusy(false)
    setMigrateMode(children.length > 0 ? 'pick' : 'create')
    setMoveToProgramId(children[0]?.id ?? '')
    setNewSubTitle('')
    setNewSubEventDate('')
    // Reset when the modal opens for a program — not on every children array identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open/program-scoped reset
  }, [open, program.id, program.receiveGivingsOnMain])

  const migrateValid =
    !needsMigrate ||
    (migrateMode === 'pick'
      ? Boolean(moveToProgramId)
      : newSubTitle.trim().length > 0 && Boolean(newSubEventDate))

  const dirty = receiveOnMain !== initialReceive
  const canProceed = dirty && migrateValid

  async function handleSave() {
    if (!isRoot || !canProceed) return
    setBusy(true)
    setError(null)
    try {
      if (receiveOnMain) {
        await updateProgramSettings(api, program.id, { receiveGivingsOnMain: true })
      } else if (!needsMigrate) {
        await updateProgramSettings(api, program.id, { receiveGivingsOnMain: false })
      } else if (migrateMode === 'pick') {
        await updateProgramSettings(api, program.id, {
          receiveGivingsOnMain: false,
          moveDirectToProgramId: moveToProgramId,
        })
      } else {
        await updateProgramSettings(api, program.id, {
          receiveGivingsOnMain: false,
          createSubThenMove: {
            title: newSubTitle.trim(),
            eventDate: newSubEventDate,
          },
        })
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setBusy(false)
    }
  }

  if (!isRoot) return null

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Campaign settings"
      description="Control how this main campaign receives givings."
      size="md"
    >
      <div className="space-y-5" data-testid="campaign-settings-form">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {receivePolicy.label}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="About receive givings on main"
                    >
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {receivePolicy.helpText}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">{receivePolicy.helpText}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={receiveOnMain}
            data-testid="settings-receive-givings-on-main"
            onClick={() => setReceiveOnMain(!receiveOnMain)}
            className={
              receiveOnMain
                ? 'relative inline-flex h-6 w-11 shrink-0 rounded-full bg-primary transition-colors'
                : 'relative inline-flex h-6 w-11 shrink-0 rounded-full bg-muted transition-colors'
            }
          >
            <span
              className={
                receiveOnMain
                  ? 'pointer-events-none absolute top-0.5 size-5 translate-x-5 rounded-full bg-white shadow transition-transform'
                  : 'pointer-events-none absolute top-0.5 size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform'
              }
            />
          </button>
        </div>

        {needsMigrate && (
          <div className="space-y-3" data-testid="migrate-direct-givings">
            <p className="text-sm text-muted-foreground">
              This campaign has {program.directContributionCount} direct giving
              {program.directContributionCount === 1 ? '' : 's'} on the main. Choose a
              sub-campaign to move them to before turning receive off.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['pick', 'Existing sub-campaign', childOptions.length === 0],
                  ['create', 'Create new sub-campaign', false],
                ] as const
              ).map(([mode, label, disabled]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                    migrateMode === mode
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-border/60 hover:bg-muted/40',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                  onClick={() => setMigrateMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>

            {migrateMode === 'pick' ? (
              <WizardField label="Move directs to" id="settings-move-to" required>
                <select
                  id="settings-move-to"
                  value={moveToProgramId}
                  onChange={(e) => setMoveToProgramId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="migrate-pick-sub"
                >
                  {childOptions.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.title}
                    </option>
                  ))}
                </select>
              </WizardField>
            ) : (
              <div className="space-y-3">
                <WizardField label="Sub-campaign name" id="settings-new-sub-title" required>
                  <Input
                    id="settings-new-sub-title"
                    value={newSubTitle}
                    onChange={(e) => setNewSubTitle(e.target.value)}
                    placeholder="Week 1"
                    data-testid="migrate-create-sub-title"
                  />
                </WizardField>
                <WizardField label="Event date" id="settings-new-sub-event" required>
                  <DatePicker
                    id="settings-new-sub-event"
                    value={newSubEventDate}
                    minDate={program.startsOn || undefined}
                    maxDate={program.endsOn || undefined}
                    disablePast
                    onChange={setNewSubEventDate}
                    placeholder="Pick event date"
                  />
                </WizardField>
              </div>
            )}
          </div>
        )}

        <WizardFooter
          step={0}
          busy={busy}
          onCancel={() => onOpenChange(false)}
          onBack={() => onOpenChange(false)}
          onNext={() => void handleSave()}
          isLastStep
          canProceed={canProceed}
          submitLabel="Save settings"
        />
      </div>
    </Modal>
  )
}
