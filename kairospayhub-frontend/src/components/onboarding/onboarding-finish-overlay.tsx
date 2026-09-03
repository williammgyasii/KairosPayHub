import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { authEase } from '@/components/layout/auth-motion'
import { KairosLogo, KairosWordmark } from '@/components/layout/kairos-logo'

export const ONBOARDING_FINISH_LABELS = [
  'Saving your structure…',
  'Setting up your workspace…',
  'Preparing your dashboard…',
  'Almost ready…',
] as const

const MIN_FINISH_MS = 2800
const LABEL_INTERVAL_MS = 650
const FINAL_PAUSE_MS = 400

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function runOnboardingFinishSequence(
  onLabelIndex: (index: number) => void,
  work: () => Promise<void>,
) {
  onLabelIndex(0)

  let labelIndex = 0
  const labelTimer = window.setInterval(() => {
    labelIndex = Math.min(labelIndex + 1, ONBOARDING_FINISH_LABELS.length - 2)
    onLabelIndex(labelIndex)
  }, LABEL_INTERVAL_MS)

  try {
    await Promise.all([work(), sleep(MIN_FINISH_MS)])
  } finally {
    window.clearInterval(labelTimer)
  }

  onLabelIndex(ONBOARDING_FINISH_LABELS.length - 1)
  await sleep(FINAL_PAUSE_MS)
}

interface OnboardingFinishOverlayProps {
  label: string
}

export function OnboardingFinishOverlay({ label }: OnboardingFinishOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: authEase }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mb-8 flex flex-col items-center gap-1.5 opacity-80">
        <KairosLogo size="sm" />
        <KairosWordmark className="text-xs text-muted-foreground" />
      </div>

      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />

      <AnimatePresence mode="wait">
        <motion.p
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: authEase }}
          className="mt-5 text-sm font-medium text-foreground"
        >
          {label}
        </motion.p>
      </AnimatePresence>

      <p className="mt-2 text-xs text-muted-foreground">This only takes a moment</p>
    </motion.div>
  )
}
