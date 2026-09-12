import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

interface SideSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  /** page = full viewport below lg; rail = right drawer (default). */
  cover?: 'rail' | 'page'
}

export function SideSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  cover = 'rail',
}: SideSheetProps) {
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
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close panel"
        onClick={() => onOpenChange(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-sheet-title"
        data-cover={cover}
        className={cn(
          'absolute flex flex-col bg-background shadow-xl',
          cover === 'page'
            ? 'inset-0 z-10 w-full max-w-none pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:left-auto lg:right-0 lg:w-full lg:max-w-md lg:border-l lg:pb-0'
            : 'inset-y-0 right-0 w-full max-w-md border-l',
          className,
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="side-sheet-title" className="text-base font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  )
}
