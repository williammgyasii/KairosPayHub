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
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </p>
        <p className="truncate text-xs font-medium text-foreground">{steps[currentStep]}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isActive = index === currentStep
          return (
            <div key={step} className="flex min-w-0 flex-1 items-center gap-1.5">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex size-2.5 rounded-full transition-all duration-500 ease-out',
                    isComplete && 'bg-primary scale-100',
                    isActive && 'scale-125 bg-primary shadow-[0_0_0_4px] shadow-primary/20',
                    !isComplete && !isActive && 'bg-muted-foreground/25',
                  )}
                  title={step}
                />
                <span
                  className={cn(
                    'hidden max-w-[4.5rem] truncate text-[10px] sm:block',
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  className={cn(
                    'mb-4 h-px flex-1 rounded-full transition-colors duration-500',
                    index < currentStep ? 'bg-primary/50' : 'bg-border/60',
                  )}
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
            nextLabel
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
