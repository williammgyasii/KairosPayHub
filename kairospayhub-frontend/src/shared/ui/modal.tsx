import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  titleAccessory?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  size?: 'md' | 'lg' | 'xl'
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  titleAccessory,
  children,
  className,
  contentClassName,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative flex max-h-[min(92vh,840px)] w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl',
          size === 'xl' ? 'max-w-2xl' : size === 'lg' ? 'max-w-xl' : 'max-w-lg',
          className,
        )}
      >
        <header className="shrink-0 border-b px-5 py-3">
          <div className="flex items-center gap-3">
            <h2 id="modal-title" className="min-w-0 truncate text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {titleAccessory}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          {description && (
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>
          )}
        </header>
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-5 py-4',
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
