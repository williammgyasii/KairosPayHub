import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, ImageIcon, Upload, User, Users, X } from 'lucide-react'
import type { ApiClient } from '@/api/core'
import type { RemittanceMedium } from '@/api/giving'
import { createContribution, uploadGivingAttachment } from '@/api/giving'
import type { ChurchRole } from '@/api/auth'
import type { StructureTree } from '@/api/structure'
import { GivingMemberPicker } from '@/components/giving/giving-member-picker'
import { RemittanceDestinationField } from '@/components/giving/remittance-destination-field'
import {
  bulkBatchDetailsDescription,
  bulkPendingApprovalLabel,
  bulkRemittanceAmountLabel,
  bulkRemittanceFirstStepLabel,
  bulkRemittanceQuestion,
  bulkRemittanceTargetLabel,
  bulkSubmitLabel,
  type ChurchPaymentMode,
} from '@/lib/giving-ui'
import {
  WizardField,
  WizardFooter,
  WizardStepPanel,
} from '@/components/structure/wizard-shell'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { InlineSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type LogMode = 'single' | 'bulk'

type MemberLine = {
  memberId: string
  memberName: string
  amount: string
}

type SubmitPhase = 'idle' | 'uploading' | 'submitting'

type SubmitSuccess = {
  mode: LogMode
  memberCount: number
  totalAmount: number
  memberLabel: string
  proofPreviewUrl: string | null
}

interface LogContributionWizardProps {
  api: ApiClient
  programId: string
  meRole: ChurchRole | 'Leader'
  tree: StructureTree | null
  scopeNodeId?: string | null
  paymentModes?: ChurchPaymentMode[]
  disabled?: boolean
  className?: string
  onLogged: () => void | Promise<void>
}

const MODE_STEP = ['How to log'] as const
const SINGLE_STEPS = ['Member, amount & proof'] as const

export function LogContributionWizard({
  api,
  programId,
  meRole,
  tree,
  scopeNodeId,
  paymentModes = [],
  disabled,
  className,
  onLogged,
}: LogContributionWizardProps) {
  const canBulkLog = meRole === 'PFCCManager' || meRole === 'FellowshipLeader'

  const [mode, setMode] = useState<LogMode | null>(canBulkLog ? null : 'single')
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [busy, setBusy] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const [success, setSuccess] = useState<SubmitSuccess | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [sentToPastor, setSentToPastor] = useState<boolean | null>(null)
  const [pastorAmount, setPastorAmount] = useState('')
  const [memberLines, setMemberLines] = useState<MemberLine[]>([])

  const [remittanceMedium, setRemittanceMedium] = useState<RemittanceMedium | ''>('')
  const [remittanceMediumOther, setRemittanceMediumOther] = useState('')

  const [memberId, setMemberId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [amount, setAmount] = useState('')
  const [dateSent, setDateSent] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const bulkSteps = useMemo(
    () =>
      [
        bulkRemittanceFirstStepLabel(meRole),
        'Who gave what',
        'Where & proof',
      ] as const,
    [meRole],
  )

  const steps = useMemo(() => {
    if (canBulkLog && mode === null) return [...MODE_STEP]
    if (mode === 'bulk') return [...bulkSteps]
    return [...SINGLE_STEPS]
  }, [canBulkLog, mode, bulkSteps])

  useEffect(() => {
    if (!receipt) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(receipt)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [receipt])

  const linesTotal = useMemo(
    () => memberLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [memberLines],
  )

  const targetTotal = sentToPastor ? Number(pastorAmount) || 0 : linesTotal

  const totalsMatch =
    memberLines.length > 0 &&
    memberLines.every((line) => Number(line.amount) > 0) &&
    Math.abs(linesTotal - targetTotal) < 0.01

  function goNext() {
    setDirection('forward')
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  function goBack() {
    setDirection('back')
    setStep((current) => Math.max(current - 1, 0))
  }

  function handleBack() {
    if (step === 0 && canBulkLog) {
      setMode(null)
      setStep(0)
      return
    }
    goBack()
  }

  function selectMode(nextMode: LogMode) {
    setMode(nextMode)
    setDirection('forward')
    setStep(0)
    setError(null)
  }

  function selectSingleMember(member: { id: string; name: string }) {
    setMemberId(member.id)
    setMemberName(member.name)
  }

  function addMemberLine(member: { id: string; name: string }) {
    if (memberLines.some((line) => line.memberId === member.id)) return
    setMemberLines((prev) => [
      ...prev,
      { memberId: member.id, memberName: member.name, amount: '' },
    ])
  }

  function removeMemberLine(memberIdToRemove: string) {
    setMemberLines((prev) => prev.filter((line) => line.memberId !== memberIdToRemove))
  }

  function updateMemberLineAmount(id: string, value: string) {
    setMemberLines((prev) =>
      prev.map((line) => (line.memberId === id ? { ...line, amount: value } : line)),
    )
  }

  const canProceed = useMemo(() => {
    if (mode === 'bulk') {
      if (step === 0) {
        if (sentToPastor === null) return false
        if (sentToPastor && (!pastorAmount || Number(pastorAmount) <= 0)) return false
        return true
      }
      if (step === 1) return totalsMatch
      if (step === 2) {
        if (sentToPastor && !remittanceMedium) return false
        if (remittanceMedium === 'Other' && !remittanceMediumOther.trim()) return false
        return Boolean(receipt) && Boolean(dateSent)
      }
      return false
    }

    if (step === 0) {
      return (
        Boolean(memberId) &&
        Number(amount) > 0 &&
        Boolean(dateSent) &&
        Boolean(receipt)
      )
    }
    return false
  }, [
    mode,
    step,
    sentToPastor,
    pastorAmount,
    totalsMatch,
    remittanceMedium,
    remittanceMediumOther,
    receipt,
    dateSent,
    memberId,
    amount,
  ])

  async function handleSubmit() {
    if (!receipt || !canProceed || !mode) return
    setBusy(true)
    setSubmitPhase('uploading')
    setError(null)
    try {
      const attachment = await uploadGivingAttachment(receipt)
      setSubmitPhase('submitting')
      const batchId = mode === 'bulk' ? crypto.randomUUID() : null
      const isoDate = `${dateSent}T12:00:00.000Z`

      if (mode === 'bulk') {
        for (const line of memberLines) {
          await createContribution(api, programId, {
            memberId: line.memberId,
            amount: Number(line.amount),
            currency: 'GHS',
            dateSent: isoDate,
            attachmentKey: attachment.attachmentKey,
            notes: notes.trim() || null,
            sentToPastor,
            remittanceMedium: sentToPastor ? remittanceMedium : null,
            remittanceMediumOther:
              sentToPastor && remittanceMedium === 'Other'
                ? remittanceMediumOther.trim()
                : null,
            batchId,
          })
        }
      } else {
        await createContribution(api, programId, {
          memberId,
          amount: Number(amount),
          currency: 'GHS',
          dateSent: isoDate,
          attachmentKey: attachment.attachmentKey,
          notes: notes.trim() || null,
        })
      }

      const selectedMember = memberLines.find((line) => line.memberId === memberId)
      setSuccess({
        mode,
        memberCount: mode === 'bulk' ? memberLines.length : 1,
        totalAmount: mode === 'bulk' ? linesTotal : Number(amount),
        memberLabel:
          mode === 'bulk'
            ? `${memberLines.length} members`
            : memberName || selectedMember?.memberName || 'Member',
        proofPreviewUrl: previewUrl,
      })
      await onLogged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log giving')
    } finally {
      setBusy(false)
      setSubmitPhase('idle')
    }
  }

  function resetForAnother() {
    setSuccess(null)
    setError(null)
    setSentToPastor(null)
    setPastorAmount('')
    setMemberLines([])
    setRemittanceMedium('')
    setRemittanceMediumOther('')
    setMemberId('')
    setMemberName('')
    setAmount('')
    setDateSent(new Date().toISOString().slice(0, 10))
    setNotes('')
    setReceipt(null)
    setDirection('forward')
    setStep(0)
    if (canBulkLog) {
      setMode(null)
    } else {
      setMode('single')
    }
  }

  function handleNext() {
    if (step >= steps.length - 1) {
      void handleSubmit()
      return
    }
    goNext()
  }

  const remittanceTarget = bulkRemittanceTargetLabel(meRole)

  const submitLabel = bulkSubmitLabel(meRole, mode === 'bulk' && sentToPastor === true)

  const submitBusyLabel = submitPhase === 'uploading' ? 'Uploading proof…' : 'Submitting…'

  const progress = success ? 100 : ((step + 1) / steps.length) * 100

  const modeTitle = success
    ? 'Submitted for approval'
    : mode === 'bulk'
      ? 'Bulk logging'
      : mode === 'single'
        ? 'Single logging'
        : 'Log giving'

  const modeDescription = success
    ? 'Your submission is pending review. You will be notified when it is approved or rejected.'
    : mode === 'bulk'
      ? meRole === 'FellowshipLeader'
        ? 'Record many members — totals must match what was sent upstream.'
        : 'Record many members — pastor approval required before amounts count as approved.'
      : mode === 'single'
        ? 'One member, one payment with proof. Submissions stay pending until approved.'
        : canBulkLog
          ? 'Choose single or bulk logging for this giving.'
          : 'Log a member payment with proof. Submissions stay pending until approved.'

  return (
    <Card className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 space-y-2 border-b border-border/50 bg-muted/10 px-5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{modeTitle}</CardTitle>
              {mode !== null && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    mode === 'bulk'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/60 bg-muted/40 text-muted-foreground',
                  )}
                >
                  {mode === 'bulk' ? 'Bulk' : 'Single'}
                </span>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm">{modeDescription}</CardDescription>
          </div>
          {mode !== null && !success && (
            <div className="shrink-0 text-right text-xs">
              <p className="font-medium text-foreground">{steps[step]}</p>
              <p className="text-muted-foreground">
                Step {step + 1} of {steps.length}
              </p>
            </div>
          )}
        </div>
        {mode !== null && (
          <Progress value={progress} className="h-1 transition-all duration-500 ease-out" />
        )}
      </CardHeader>
      <CardContent className="relative flex min-h-0 flex-1 flex-col p-0">
        {busy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card px-6 py-5 shadow-sm">
              <InlineSpinner className="size-8 text-primary" />
              <p className="text-sm font-medium">
                {submitPhase === 'uploading' ? 'Uploading payment proof…' : 'Saving contribution…'}
              </p>
            </div>
          </div>
        )}

        {success ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Submitted for approval</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {success.mode === 'bulk'
                ? `${success.memberCount} contributions (GHS ${success.totalAmount.toFixed(2)} total) are ${bulkPendingApprovalLabel(meRole, sentToPastor === true).toLowerCase()}.`
                : `${success.memberLabel} · GHS ${success.totalAmount.toFixed(2)} is pending approval.`}
            </p>
            {success.proofPreviewUrl && (
              <img
                src={success.proofPreviewUrl}
                alt="Submitted payment proof"
                className="mt-4 max-h-40 max-w-full rounded-lg border border-border/60 object-contain"
              />
            )}
            <Button type="button" className="mt-6" onClick={resetForAnother}>
              Log another
            </Button>
          </div>
        ) : (
          <>
        {error && (
          <p className="mx-5 mt-3 shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <WizardStepPanel
          stepKey={`${mode ?? 'pick'}-${step}`}
          direction={direction}
          fill
          className="px-5 py-3"
        >
          {canBulkLog && mode === null && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeCard
                icon={User}
                title="Single logging"
                description="One member, one payment"
                onClick={() => selectMode('single')}
              />
              <ModeCard
                icon={Users}
                title="Bulk logging"
                description="Many members — totals must match what was sent"
                onClick={() => selectMode('bulk')}
              />
            </div>
          )}

          {mode === 'single' && step === 0 && (
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] xl:grid-rows-none">
              <GivingMemberPicker
                api={api}
                tree={tree}
                scopeNodeId={scopeNodeId}
                selectedMemberId={memberId}
                actionLabel="Select"
                compact
                className="min-h-0 flex-1"
                disabled={disabled || busy}
                onSelect={selectSingleMember}
              />

              <LogSection
                title="Payment details"
                description="Enter the amount and attach proof."
                fill
              >
                <div className="grid grid-cols-2 gap-3">
                  <WizardField label="Amount (GHS)" id="single-amount" required>
                    <Input
                      id="single-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      disabled={disabled || busy}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </WizardField>
                  <WizardField label="Date sent" id="single-date" required>
                    <DatePicker
                      id="single-date"
                      value={dateSent}
                      onChange={setDateSent}
                      disabled={disabled || busy}
                      required
                    />
                  </WizardField>
                </div>
                <WizardField label="Notes" id="single-notes">
                  <Input
                    id="single-notes"
                    value={notes}
                    disabled={disabled || busy}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional reference"
                  />
                </WizardField>

                <ReceiptField
                  receipt={receipt}
                  previewUrl={previewUrl}
                  disabled={disabled || busy}
                  onChange={setReceipt}
                  compact
                  fill
                />
              </LogSection>
            </div>
          )}

          {mode === 'bulk' && step === 0 && (
            <div className="space-y-4">
              <WizardField label={bulkRemittanceQuestion(meRole)} id="sent-upstream" required>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ChoiceButton
                    active={sentToPastor === true}
                    onClick={() => setSentToPastor(true)}
                  >
                    Yes, already sent
                  </ChoiceButton>
                  <ChoiceButton
                    active={sentToPastor === false}
                    onClick={() => setSentToPastor(false)}
                  >
                    Not yet
                  </ChoiceButton>
                </div>
              </WizardField>
              {sentToPastor && (
                <WizardField label={bulkRemittanceAmountLabel(meRole)} id="upstream-amount" required>
                  <Input
                    id="upstream-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pastorAmount}
                    disabled={disabled || busy}
                    onChange={(e) => setPastorAmount(e.target.value)}
                  />
                </WizardField>
              )}
              {sentToPastor === false && (
                <p className="text-sm text-muted-foreground">
                  Next you&apos;ll record who gave what. The batch total will be the sum of member
                  amounts.
                </p>
              )}
            </div>
          )}

          {mode === 'bulk' && step === 1 && (
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] xl:grid-rows-none">
              <GivingMemberPicker
                api={api}
                tree={tree}
                scopeNodeId={scopeNodeId}
                excludeMemberIds={memberLines.map((line) => line.memberId)}
                compact
                className="min-h-0 flex-1"
                disabled={disabled || busy}
                onSelect={addMemberLine}
              />

              <LogSection
                title="Your batch"
                description="Enter an amount for each member added."
                fill
              >
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Batch total</span>
                  <span className="font-semibold tabular-nums">
                    GHS {linesTotal.toFixed(2)}
                    {sentToPastor && (
                      <span className="ml-2 text-muted-foreground">
                        / GHS {Number(pastorAmount).toFixed(2)} sent to {remittanceTarget}
                      </span>
                    )}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {memberLines.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-8 text-center text-sm text-muted-foreground">
                      Added members appear here with amount fields.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {memberLines.map((line) => (
                        <li
                          key={line.memberId}
                          className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{line.memberName}</p>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28"
                            placeholder="Amount"
                            value={line.amount}
                            disabled={disabled || busy}
                            onChange={(e) => updateMemberLineAmount(line.memberId, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            disabled={disabled || busy}
                            onClick={() => removeMemberLine(line.memberId)}
                          >
                            <X className="size-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {sentToPastor && memberLines.length > 0 && !totalsMatch && (
                  <p className="text-sm text-amber-800">
                    Member amounts must add up to GHS {Number(pastorAmount).toFixed(2)} sent to your{' '}
                    {remittanceTarget} before you can continue.
                  </p>
                )}
              </LogSection>
            </div>
          )}

          {mode === 'bulk' && step === 2 && (
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,0.9fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:grid-rows-none">
              <LogSection
                title="Batch details"
                description={bulkBatchDetailsDescription(meRole, sentToPastor === true)}
                fill
                scrollable
              >
                {sentToPastor && (
                  <RemittanceDestinationField
                    role={meRole}
                    value={remittanceMedium}
                    otherValue={remittanceMediumOther}
                    onChange={setRemittanceMedium}
                    onOtherChange={setRemittanceMediumOther}
                    disabled={disabled || busy}
                    paymentModes={paymentModes}
                  />
                )}

                <WizardField
                  label={sentToPastor ? 'When was the payment sent?' : 'Date collected'}
                  id="bulk-date"
                  required
                >
                  <DatePicker
                    id="bulk-date"
                    value={dateSent}
                    onChange={setDateSent}
                    disabled={disabled || busy}
                    required
                  />
                </WizardField>

                <WizardField label="Notes" id="bulk-notes">
                  <Input
                    id="bulk-notes"
                    value={notes}
                    disabled={disabled || busy}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional batch reference"
                  />
                </WizardField>

                <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3 text-sm">
                  <p className="font-medium">Review</p>
                  <p className="mt-1 text-muted-foreground">
                    {memberLines.length} member{memberLines.length === 1 ? '' : 's'} · GHS{' '}
                    {linesTotal.toFixed(2)} ·{' '}
                    {bulkPendingApprovalLabel(meRole, sentToPastor === true)}
                  </p>
                </div>
              </LogSection>

              <LogSection title="Payment proof" description="Upload a screenshot of the transfer." fill>
                <ReceiptField
                  receipt={receipt}
                  previewUrl={previewUrl}
                  disabled={disabled || busy}
                  onChange={setReceipt}
                  compact
                />
              </LogSection>
            </div>
          )}
        </WizardStepPanel>

        {mode !== null && (
          <div className="shrink-0 border-t border-border/50 px-5 py-3">
            <WizardFooter
            step={step}
            busy={busy}
            busyLabel={submitBusyLabel}
            onCancel={() => {
              if (canBulkLog && step === 0 && mode !== null) {
                setMode(null)
                setStep(0)
                return
              }
              setStep(0)
            }}
            onBack={handleBack}
            onNext={handleNext}
            isLastStep={step >= steps.length - 1}
            canProceed={canProceed}
            submitLabel={submitLabel}
            nextLabel="Continue"
            />
          </div>
        )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function LogSection({
  title,
  description,
  children,
  className,
  fill = false,
  scrollable = false,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
  fill?: boolean
  scrollable?: boolean
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 sm:p-5',
        fill && 'min-h-0',
        className,
      )}
    >
      <div className="shrink-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div
        className={cn(
          'flex flex-col gap-3',
          fill && 'min-h-0 flex-1',
          scrollable ? 'overflow-y-auto pr-1' : fill && 'overflow-hidden',
        )}
      >
        {children}
      </div>
    </section>
  )
}

function ModeCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof User
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-muted/10 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
    >
      <Icon className="size-5 text-primary" />
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  )
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border/60 bg-background hover:bg-muted/20',
      )}
    >
      {children}
    </button>
  )
}

function ReceiptField({
  receipt,
  previewUrl,
  disabled,
  onChange,
  compact = false,
  fill = false,
}: {
  receipt: File | null
  previewUrl: string | null
  disabled?: boolean
  onChange: (file: File | null) => void
  compact?: boolean
  fill?: boolean
}) {
  return (
    <WizardField
      label="Payment screenshot"
      id="log-receipt"
      required
      className={cn(fill && 'flex min-h-0 flex-1 flex-col')}
    >
      <label
        htmlFor="log-receipt"
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 transition-colors hover:bg-muted/20',
          fill ? 'min-h-0 flex-1 py-3' : compact ? 'min-h-[140px] py-4' : 'min-h-[220px] py-8',
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Receipt preview"
            className={cn(
              'max-w-full object-contain',
              fill ? 'max-h-full' : compact ? 'max-h-32' : 'max-h-56',
            )}
          />
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-center text-sm text-muted-foreground">
              JPEG, PNG, or WebP · max 5 MB
            </span>
          </>
        )}
        <input
          id="log-receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {receipt && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" />
          {receipt.name}
        </p>
      )}
    </WizardField>
  )
}
