import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { InlineSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export { WizardIntro } from '@/components/structure/structure-chain'

export function WizardStepper({
  steps,
  currentStep,
  className,
}: {
  steps: readonly string[]
  currentStep: number
  className?: string
}) {
  return (
    <div className={cn('w-full space-y-3', className)}>
      <p className="text-center text-xs font-medium text-muted-foreground">
        Step {currentStep + 1} of {steps.length}
      </p>

      <div className="flex w-full items-center gap-1">
        {steps.map((stepLabel, index) => {
          const isComplete = index < currentStep
          const isActive = index === currentStep
          return (
            <div key={stepLabel} className="flex min-w-0 flex-1 items-center gap-1">
              <div
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center rounded-lg border px-2 py-2 text-center transition-colors',
                  isActive && 'border-primary/40 bg-primary/5 ring-1 ring-primary/10',
                  isComplete && !isActive && 'border-primary/20 bg-primary/[0.04]',
                  !isActive && !isComplete && 'border-border/60 bg-muted/10',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wide',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  Step {index + 1}
                </span>
                <span
                  className={cn(
                    'mt-0.5 w-full truncate text-xs font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {stepLabel}
                </span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0',
                    index < currentStep ? 'text-primary' : 'text-muted-foreground/40',
                  )}
                  aria-hidden
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WizardProgressBar({ value }: { value: number }) {
  return <Progress value={value} className="h-1.5 transition-all duration-500 ease-out" />
}

export function WizardStepPanel({
  stepKey,
  direction,
  children,
  className,
  fill = false,
}: {
  stepKey: string | number
  direction: 'forward' | 'back'
  children: React.ReactNode
  className?: string
  fill?: boolean
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill ? 'min-h-0 flex-1' : 'min-h-[380px]',
        className,
      )}
    >
      <div
        key={stepKey}
        className={cn(
          'duration-500 ease-out fill-mode-both animate-in fade-in',
          fill ? 'flex h-full min-h-0 flex-col' : 'space-y-4',
          direction === 'forward' ? 'slide-in-from-right-6' : 'slide-in-from-left-6',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function WizardFooter({
  step,
  busy,
  onCancel,
  onBack,
  onNext,
  nextLabel = 'Continue',
  submitLabel = 'Save',
  isLastStep,
  canProceed,
  busyLabel = 'Saving…',
}: {
  step: number
  busy: boolean
  onCancel: () => void
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  submitLabel?: string
  isLastStep: boolean
  canProceed: boolean
  busyLabel?: string
}) {
  return (
    <div className="flex justify-between gap-2 pt-1">
      <Button type="button" variant="ghost" disabled={busy} onClick={step === 0 ? onCancel : onBack}>
        {step > 0 && <ChevronLeft className="size-4" />}
        {step === 0 ? 'Cancel' : 'Back'}
      </Button>

      {isLastStep ? (
        <Button type="button" disabled={busy || !canProceed} onClick={onNext} className="min-w-28">
          {busy ? (
            <>
              <InlineSpinner className="mr-2 text-primary-foreground" />
              {busyLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      ) : (
        <Button
          type="button"
          disabled={busy || !canProceed}
          onClick={onNext}
          className="min-w-28 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {busy ? (
            <>
              <InlineSpinner className="mr-2 text-primary-foreground" />
              {nextLabel === 'Continue' ? 'Loading…' : nextLabel}
            </>
          ) : (
            <>
              {nextLabel}
              <ChevronRight className="size-4" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}

export function WizardField({
  label,
  id,
  children,
  className,
  required = false,
}: {
  label: string
  id: string
  children: React.ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  )
}
