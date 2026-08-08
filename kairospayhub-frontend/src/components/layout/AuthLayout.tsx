import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthCarousel } from '@/components/layout/auth-carousel'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 p-10 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-black/10 blur-3xl" />

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-sm"
          >
            ⛪
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mt-6 text-sm font-medium uppercase tracking-widest text-primary-foreground/70"
          >
            KairosPayHub
          </motion.p>
          <div className="mt-8">
            <AuthCarousel />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="relative text-sm text-primary-foreground/75"
        >
          For pastors and church leaders
        </motion.p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-lg">
              ⛪
            </div>
            <div>
              <p className="text-sm font-semibold">KairosPayHub</p>
              <p className="text-xs text-muted-foreground">Church giving, simplified</p>
            </div>
          </div>

          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </header>

          {children}

          {footer && (
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </div>
      </main>
    </div>
  )
}

export function AuthFooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  )
}

export function AuthFormCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-7">
      {children}
    </div>
  )
}
