import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { authEase, authFadeUp, authStagger } from '@/shared/layout/auth-motion'
import { CenteredPageShell } from '@/shared/layout/centered-page-shell'
import { KairosLogo, KairosWordmark } from '@/shared/layout/kairos-logo'

const CONFETTI = [
  { x: -72, y: -28, delay: 0.05, color: 'bg-sky-400' },
  { x: 68, y: -36, delay: 0.12, color: 'bg-emerald-400' },
  { x: -48, y: 42, delay: 0.18, color: 'bg-amber-400' },
  { x: 54, y: 38, delay: 0.08, color: 'bg-violet-400' },
  { x: -88, y: 8, delay: 0.22, color: 'bg-rose-400' },
  { x: 82, y: 4, delay: 0.15, color: 'bg-teal-400' },
] as const

interface JoinSuccessViewProps {
  unitName: string
  churchName?: string | null
}

export function JoinSuccessView({ unitName, churchName }: JoinSuccessViewProps) {
  return (
    <CenteredPageShell maxWidth="sm">
      <motion.div
        className="flex flex-col items-center text-center"
        variants={authStagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={authFadeUp} className="mb-6 flex flex-col items-center gap-3">
          <KairosLogo size="md" />
          <KairosWordmark />
        </motion.div>

        <motion.div variants={authFadeUp} className="relative mb-8">
          {CONFETTI.map((piece, index) => (
            <motion.span
              key={index}
              aria-hidden
              className={`absolute left-1/2 top-1/2 size-2 rounded-full ${piece.color}`}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                x: piece.x,
                y: piece.y,
                scale: [0, 1, 0.6],
              }}
              transition={{
                duration: 0.9,
                delay: 0.35 + piece.delay,
                ease: authEase,
              }}
            />
          ))}

          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
            initial={{ opacity: 0.8, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.55 }}
            transition={{ duration: 1.1, delay: 0.2, ease: 'easeOut' }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-emerald-400/25"
            initial={{ opacity: 0.6, scale: 0.75 }}
            animate={{ opacity: 0, scale: 1.35 }}
            transition={{ duration: 1.3, delay: 0.35, ease: 'easeOut' }}
          />

          <motion.div
            className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.08 }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.28 }}
            >
              <Check className="size-10 stroke-[2.5]" aria-hidden />
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.header variants={authFadeUp} className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkles className="size-3.5" aria-hidden />
            Request received
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;re on the list</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{unitName}</span>
            {churchName ? (
              <>
                {' '}
                at {churchName}
              </>
            ) : null}{' '}
            will accept you shortly. You don&apos;t need an account.
          </p>
        </motion.header>

        <motion.div
          variants={authFadeUp}
          className="mt-8 w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
        >
          Your leader will review your details. Once accepted, you&apos;ll show up on the roster —
          no login required.
        </motion.div>

        <motion.p variants={authFadeUp} className="mt-6 text-xs text-muted-foreground">
          You can close this page.
        </motion.p>
      </motion.div>
    </CenteredPageShell>
  )
}
