import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Paperclip,
  X,
} from 'lucide-react'
import type { ApiClient } from '@/api/core'
import {
  createContribution,
  createContributionBatch,
  formatAmount,
  getChurchDefaultCurrency,
  joinGivingAttachmentKeys,
  uploadGivingAttachment,
} from '@/api/giving'
import type { ChurchRole } from '@/api/auth'
import type { StructureTree } from '@/api/structure'
import { MemberSearchSelect } from '@/components/giving/member-search-select'
import {
  WizardField,
  WizardProgressBar,
  WizardStepPanel,
  WizardStepper,
} from '@/components/structure/wizard-shell'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  givingScopePolicy,
  leadershipFromProfile,
} from '@/lib/giving-scope-policy'

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
  proofPreviewUrls: string[]
}

interface LogContributionWizardProps {
  api: ApiClient
  programId: string
  meRole: ChurchRole | 'Leader'
  /** Prefer leadership profile when available; falls back to role. */
  leadershipProfile?: string | null
  tree: StructureTree | null
  scopeNodeId?: string | null
  embedded?: boolean
  disabled?: boolean
  className?: string
  onCancel?: () => void
  onLogged: () => void | Promise<void>
}

const SINGLE_STEPS = ['Member', 'Payment'] as const
const BULK_STEPS = ['Members & amounts', 'Review'] as const

export function LogContributionWizard({
  api,
  programId,
  meRole,
  leadershipProfile = null,
  tree,
  scopeNodeId,
  disabled,
  embedded,
  className,
  onCancel,
  onLogged,
}: LogContributionWizardProps) {
  const actorLeadership = leadershipFromProfile(leadershipProfile, meRole)
  const canBulkLog = tree
    ? givingScopePolicy({
        tree,
        actorLeadership,
        actorScopeNodeId: scopeNodeId,
      }).canBulkLog
    : actorLeadership === 'churchWide' || actorLeadership === 'intermediate'
  const currency = getChurchDefaultCurrency()

  const [mode, setMode] = useState<LogMode | null>(canBulkLog ? null : 'single')
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [busy, setBusy] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const [success, setSuccess] = useState<SubmitSuccess | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [memberLines, setMemberLines] = useState<MemberLine[]>([])

  const [memberId, setMemberId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [amount, setAmount] = useState('')
  const [dateSent] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [receipts, setReceipts] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const steps = mode === 'bulk' ? [...BULK_STEPS] : [...SINGLE_STEPS]

  useEffect(() => {
    const urls = receipts.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [receipts])

  const linesTotal = useMemo(
    () => memberLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [memberLines],
  )

  const amountsComplete =
    memberLines.length > 0 && memberLines.every((line) => Number(line.amount) > 0)

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
      setDirection('back')
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

  function addReceipts(files: FileList | File[] | null) {
    if (!files) return
    const next = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (next.length === 0) return
    setReceipts((prev) => [...prev, ...next])
  }

  function removeReceipt(index: number) {
    setReceipts((prev) => prev.filter((_, i) => i !== index))
  }

  const canProceed = useMemo(() => {
    if (mode === 'bulk') {
      if (step === 0) return amountsComplete
      if (step === 1) return receipts.length > 0 && Boolean(dateSent)
      return false
    }

    if (step === 0) return Boolean(memberId)
    if (step === 1) {
      return Number(amount) > 0 && Boolean(dateSent) && receipts.length > 0
    }
    return false
  }, [mode, step, amountsComplete, receipts.length, dateSent, memberId, amount])

  async function handleSubmit() {
    if (receipts.length === 0 || !canProceed || !mode) return
    setBusy(true)
    setSubmitPhase('uploading')
    setError(null)
    try {
      const uploaded = []
      for (const file of receipts) {
        uploaded.push(await uploadGivingAttachment(file))
      }
      const attachmentKey = joinGivingAttachmentKeys(uploaded.map((item) => item.attachmentKey))
      setSubmitPhase('submitting')
      const isoDate = `${dateSent}T12:00:00.000Z`

      if (mode === 'bulk') {
        await createContributionBatch(api, programId, {
          dateSent: isoDate,
          attachmentKey,
          currency,
          notes: notes.trim() || null,
          items: memberLines.map((line) => ({
            memberId: line.memberId,
            amount: Number(line.amount),
          })),
        })
      } else {
        await createContribution(api, programId, {
          memberId,
          amount: Number(amount),
          currency,
          dateSent: isoDate,
          attachmentKey,
          notes: notes.trim() || null,
        })
      }

      setSuccess({
        mode,
        memberCount: mode === 'bulk' ? memberLines.length : 1,
        totalAmount: mode === 'bulk' ? linesTotal : Number(amount),
        memberLabel: mode === 'bulk' ? `${memberLines.length} members` : memberName || 'Member',
        proofPreviewUrls: previewUrls,
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
    setMemberLines([])
    setMemberId('')
    setMemberName('')
    setAmount('')
    setNotes('')
    setReceipts([])
    setDirection('forward')
    setStep(0)
    setMode(canBulkLog ? null : 'single')
  }

  function handleNext() {
    if (step >= steps.length - 1) {
      void handleSubmit()
      return
    }
    goNext()
  }

  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    if (canBulkLog && mode !== null) {
      setMode(null)
      setStep(0)
    }
  }

  const submitBusyLabel = submitPhase === 'uploading' ? 'Uploading proof…' : 'Submitting…'
  const progress = success ? 100 : mode !== null ? ((step + 1) / steps.length) * 100 : 0
  const showFlow = mode !== null && !success
  const showModePicker = canBulkLog && mode === null && !success
  const dateHintName = memberName.trim() || 'this member'

  const footerTotal =
    mode === 'single' && step === 1
      ? Number(amount) || 0
      : mode === 'bulk'
        ? linesTotal
        : null
  const showFooterTotal = footerTotal !== null

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex min-h-0 flex-col',
          embedded ? 'h-full bg-background' : 'rounded-xl border border-border/60 bg-card shadow-sm',
          className,
        )}
      >
        {showFlow && (
          <div className="shrink-0 space-y-3 border-b border-border/50 px-5 py-4">
            <WizardStepper steps={steps} currentStep={step} />
            <WizardProgressBar value={progress} />
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col">
          {success ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Submitted for approval</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {success.mode === 'bulk'
                  ? `${success.memberCount} contributions (${formatAmount(success.totalAmount, currency)} total) are pending approval.`
                  : `${success.memberLabel} · ${formatAmount(success.totalAmount, currency)} is pending approval.`}
              </p>
              {success.proofPreviewUrls.length > 0 && (
                <div className="mt-4 flex max-w-full flex-wrap justify-center gap-2">
                  {success.proofPreviewUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Submitted payment proof"
                      className="max-h-28 max-w-[140px] rounded-lg border border-border/60 object-contain"
                    />
                  ))}
                </div>
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

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {showModePicker && (
                  <div className="mx-auto max-w-md space-y-3 py-2">
                    <WizardField label="Logging mode" id="log-mode" required>
                      <select
                        id="log-mode"
                        className={cn(
                          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                          'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        )}
                        value={mode ?? ''}
                        disabled={disabled || busy}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === 'single' || value === 'bulk') selectMode(value)
                        }}
                      >
                        <option value="" disabled>
                          Choose how to log…
                        </option>
                        <option value="single">Single member — one payment</option>
                        <option value="bulk">Bulk batch — many members</option>
                      </select>
                    </WizardField>
                    <p className="text-sm text-muted-foreground">
                      Bulk: search and add members as chips with amounts, then review and submit.
                    </p>
                  </div>
                )}

                {showFlow && (
                  <WizardStepPanel
                    stepKey={`${mode}-${step}`}
                    direction={direction}
                    className="mx-auto max-w-lg"
                  >
                    {mode === 'single' && step === 0 && (
                      <div className="space-y-3">
                        <WizardField label="Member" id="single-member" required>
                          <MemberSearchSelect
                            api={api}
                            scopeNodeId={scopeNodeId}
                            disabled={disabled || busy}
                            placeholder={memberName || 'Search members…'}
                            onSelect={selectSingleMember}
                          />
                        </WizardField>
                        {memberName && (
                          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                            Selected: <span className="font-medium">{memberName}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {mode === 'single' && step === 1 && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Payment for{' '}
                          <span className="font-medium text-foreground">{memberName}</span>
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <WizardField label={`Amount (${currency})`} id="single-amount" required>
                            <div className="relative">
                              <Input
                                id="single-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                disabled={disabled || busy}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pr-14"
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                                {currency}
                              </span>
                            </div>
                          </WizardField>
                          <LoggedDateField
                            id="single-date"
                            value={dateSent}
                            hint={`This is the date logged for ${dateHintName} — the day they sent you the money.`}
                          />
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
                          receipts={receipts}
                          previewUrls={previewUrls}
                          disabled={disabled || busy}
                          onAdd={addReceipts}
                          onRemove={removeReceipt}
                        />
                      </div>
                    )}

                    {mode === 'bulk' && step === 0 && (
                      <div className="space-y-4">
                        <WizardField label="Add member" id="bulk-member-search">
                          <MemberSearchSelect
                            api={api}
                            scopeNodeId={scopeNodeId}
                            excludeIds={memberLines.map((line) => line.memberId)}
                            disabled={disabled || busy}
                            placeholder="Search and add a member…"
                            onSelect={addMemberLine}
                          />
                        </WizardField>

                        {memberLines.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">
                            Selected members appear here. Add someone, then enter their amount.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {memberLines.map((line) => (
                              <li
                                key={line.memberId}
                                className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/10 py-1.5 pl-4 pr-1.5"
                              >
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {line.memberName}
                                </span>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-8 w-28 rounded-full pr-11"
                                    placeholder="0.00"
                                    value={line.amount}
                                    disabled={disabled || busy}
                                    onChange={(e) =>
                                      updateMemberLineAmount(line.memberId, e.target.value)
                                    }
                                    aria-label={`Amount for ${line.memberName}`}
                                  />
                                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
                                    {currency}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 shrink-0 rounded-full"
                                  disabled={disabled || busy}
                                  onClick={() => removeMemberLine(line.memberId)}
                                >
                                  <X className="size-4" />
                                  <span className="sr-only">Remove {line.memberName}</span>
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {memberLines.length > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {memberLines.length} member{memberLines.length === 1 ? '' : 's'}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {formatAmount(linesTotal, currency)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {mode === 'bulk' && step === 1 && (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <p className="font-medium">Batch review</p>
                            <p className="font-semibold tabular-nums">
                              {formatAmount(linesTotal, currency)}
                            </p>
                          </div>
                          <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto text-sm">
                            {memberLines.map((line) => (
                              <li
                                key={line.memberId}
                                className="flex items-center justify-between gap-3 text-muted-foreground"
                              >
                                <span className="truncate text-foreground">{line.memberName}</span>
                                <span className="shrink-0 tabular-nums">
                                  {formatAmount(Number(line.amount), currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <LoggedDateField
                          id="bulk-date"
                          value={dateSent}
                          hint="This is the date logged for everyone in this batch — the day the money was sent to you."
                        />

                        <WizardField label="Notes" id="bulk-notes">
                          <Input
                            id="bulk-notes"
                            value={notes}
                            disabled={disabled || busy}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional batch reference"
                          />
                        </WizardField>

                        <ReceiptField
                          receipts={receipts}
                          previewUrls={previewUrls}
                          disabled={disabled || busy}
                          onAdd={addReceipts}
                          onRemove={removeReceipt}
                        />
                      </div>
                    )}
                  </WizardStepPanel>
                )}
              </div>
            </>
          )}
        </div>

        {!success && (showFlow || showModePicker) && (
          <div className="shrink-0 border-t border-border/50 bg-background px-5 py-3">
            {showModePicker ? (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" disabled={busy} onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={step === 0 ? (canBulkLog ? handleBack : handleCancel) : handleBack}
                >
                  {step === 0 && !canBulkLog ? (
                    'Cancel'
                  ) : (
                    <>
                      <ChevronLeft className="size-4" />
                      Back
                    </>
                  )}
                </Button>

                <div className="flex min-w-0 items-center gap-3">
                  {showFooterTotal && (
                    <div className="text-right leading-tight">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Total
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatAmount(footerTotal, currency)}
                      </p>
                    </div>
                  )}

                  {step >= steps.length - 1 ? (
                    <Button
                      type="button"
                      disabled={!canProceed}
                      loading={busy}
                      loadingLabel={submitBusyLabel}
                      onClick={handleNext}
                      className="min-w-28 shrink-0"
                    >
                      {mode === 'bulk' ? 'Submit batch' : 'Submit'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={busy || !canProceed}
                      onClick={handleNext}
                      className="min-w-28 shrink-0"
                    >
                      Continue
                      <ChevronRight className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

function LoggedDateField({
  id,
  value,
  hint,
}: {
  id: string
  value: string
  hint: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-xs font-medium">
          Date sent
          <span className="text-destructive"> *</span>
        </label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex text-muted-foreground hover:text-foreground"
              aria-label="About date sent"
            >
              <HelpCircle className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-left leading-relaxed">
            {hint}
          </TooltipContent>
        </Tooltip>
      </div>
      <DatePicker id={id} value={value} onChange={() => {}} disabled required />
    </div>
  )
}

function ReceiptField({
  receipts,
  previewUrls,
  disabled,
  onAdd,
  onRemove,
}: {
  receipts: File[]
  previewUrls: string[]
  disabled?: boolean
  onAdd: (files: FileList | File[] | null) => void
  onRemove: (index: number) => void
}) {
  return (
    <WizardField label="Payment screenshot" id="log-receipt" required>
      <label
        htmlFor="log-receipt"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-5 transition-colors hover:bg-muted/20"
      >
        <Paperclip className="size-5 text-muted-foreground" />
        <span className="text-center text-sm text-muted-foreground">
          {receipts.length > 0
            ? 'Add more screenshots'
            : 'JPEG, PNG, or WebP · max 5 MB each · multiple allowed'}
        </span>
        <input
          id="log-receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            onAdd(e.target.files)
            e.target.value = ''
          }}
        />
      </label>

      {previewUrls.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {previewUrls.map((url, index) => (
            <li
              key={`${receipts[index]?.name ?? 'proof'}-${index}`}
              className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/10"
            >
              <img
                src={url}
                alt={receipts[index]?.name ?? `Proof ${index + 1}`}
                className="aspect-square w-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1 top-1 size-7"
                disabled={disabled}
                onClick={() => onRemove(index)}
              >
                <X className="size-3.5" />
                <span className="sr-only">Remove screenshot</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </WizardField>
  )
}
