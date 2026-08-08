import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StructureChainItem = {
  id?: string
  label: string
  tone?: 'church' | 'layer' | 'member' | 'accent'
}

const toneClass: Record<NonNullable<StructureChainItem['tone']>, string> = {
  church: 'border-border/60 bg-muted/50 text-muted-foreground',
  layer: 'border-border/50 bg-background/80 text-foreground shadow-sm',
  member: 'border-primary/30 bg-primary/10 text-primary',
  accent: 'border-primary/40 bg-primary/15 text-primary',
}

export function StructureChain({
  items,
  className,
  size = 'sm',
  animated = true,
}: {
  items: StructureChainItem[]
  className?: string
  size?: 'sm' | 'md'
  animated?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-y-2',
        size === 'md' ? 'gap-x-2' : 'gap-x-1.5',
        className,
      )}
      aria-label={items.map((item) => item.label).join(', ')}
    >
      {items.map((item, index) => (
        <span key={item.id ?? `${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 && <ChainConnector />}
          <span
            className={cn(
              'inline-flex items-center rounded-full border font-medium backdrop-blur-sm',
              size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs',
              toneClass[item.tone ?? (index === items.length - 1 ? 'member' : 'layer')],
              animated && 'animate-chain-in',
            )}
            style={animated ? { animationDelay: `${index * 60}ms` } : undefined}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  )
}

export function StructureChainFromLabels({
  labels,
  includeChurch = false,
  includeMember = true,
  className,
  animated = true,
  size = 'sm',
}: {
  labels: string[]
  includeChurch?: boolean
  includeMember?: boolean
  className?: string
  animated?: boolean
  size?: 'sm' | 'md'
}) {
  const items: StructureChainItem[] = []
  if (includeChurch) items.push({ label: 'Church', tone: 'church' })
  labels.forEach((label, index) => {
    items.push({
      id: `layer-${index}`,
      label,
      tone: 'layer',
    })
  })
  if (includeMember) items.push({ label: 'Member', tone: 'member' })

  return <StructureChain items={items} className={className} animated={animated} size={size} />
}

function ChainConnector() {
  return (
    <span className="relative flex w-4 items-center sm:w-6" aria-hidden>
      <span className="h-px w-full bg-gradient-to-r from-transparent via-border/70 to-transparent" />
      <span className="absolute left-1/2 size-1 -translate-x-1/2 rounded-full bg-border/80" />
    </span>
  )
}

export function WizardIntro({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="animate-fade-up rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium tracking-tight">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
