import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export function MessagePanel({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            data-testid="message-panel-backdrop"
            className="absolute inset-0 bg-black/40"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="message-panel-title"
            className="absolute top-4 right-4 bottom-4 flex w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background shadow-2xl"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <header className="flex items-center gap-3 border-b px-6 py-4">
              <h2 id="message-panel-title" className="min-w-0 truncate text-lg font-semibold tracking-tight">
                {title}
              </h2>
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
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
