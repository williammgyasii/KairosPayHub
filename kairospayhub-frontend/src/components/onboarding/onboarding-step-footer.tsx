import type { ComponentProps, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OnboardingStepFooterProps {
  onBack?: () => void
  backLabel?: string
  children: ReactNode
  className?: string
}

export function OnboardingStepFooter({
  onBack,
  backLabel = 'Back',
  children,
  className,
}: OnboardingStepFooterProps) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center',
        className,
      )}
    >
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="sm:mr-auto">
          <ChevronLeft className="size-4" />
          {backLabel}
        </Button>
      ) : (
        <div className="hidden sm:block sm:mr-auto" />
      )}
      <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:justify-end">{children}</div>
    </div>
  )
}

export function OnboardingContinueButton({
  children,
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button className={cn('w-full sm:min-w-[10rem]', className)} {...props}>
      {children}
      <ChevronRight className="size-4" />
    </Button>
  )
}
