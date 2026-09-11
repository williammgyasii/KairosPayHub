import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const SLIDES = [
  {
    title: 'Church giving, simplified',
    body: 'Track tithes and offerings from cell groups to the pastor — one clear dashboard for your whole church.',
  },
  {
    title: 'Your structure, your way',
    body: 'Define PFCC, fellowship, cell, or custom layers. KairosPayHub adapts to how your church is organized.',
  },
  {
    title: 'See the full picture',
    body: 'Roll up giving by layer, spot gaps early, and keep leaders aligned without spreadsheets.',
  },
] as const

const INTERVAL_MS = 5500

export function AuthCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const slide = SLIDES[index]

  return (
    <div className="relative flex min-h-[220px] flex-col justify-end">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            className="text-3xl font-semibold tracking-tight"
          >
            {slide.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.4 }}
            className="max-w-sm text-base leading-relaxed text-primary-foreground/90"
          >
            {slide.body}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className="group p-1"
          >
            <motion.span
              className="block h-1.5 rounded-full bg-white/35 group-hover:bg-white/55"
              animate={{
                width: i === index ? 28 : 8,
                backgroundColor: i === index ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
              }}
              transition={{ duration: 0.3 }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
