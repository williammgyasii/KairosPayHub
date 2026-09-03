import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Layers, UserRound, X } from 'lucide-react'
import type { StructureLayerInput } from '@/api/structure'
import { authEase } from '@/components/layout/auth-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StructureChainPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  churchName?: string | null
  structureName?: string | null
  layers: StructureLayerInput[]
}

type PreviewNode = {
  id: string
  label: string
  subtitle?: string
  kind: 'church' | 'layer' | 'member'
}

type LayerBreakdown = {
  label: string
  detail: string
  kind: 'church' | 'layer' | 'cell' | 'member'
}

const previewStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: authEase } },
}

function buildBreakdown(churchLabel: string, layers: StructureLayerInput[]): LayerBreakdown[] {
  const orgLayers = layers.slice(0, -1)
  const cellLayer = layers[layers.length - 1]
  const cellLabel = cellLayer?.displayName ?? 'Cell'

  const items: LayerBreakdown[] = [
    {
      kind: 'church',
      label: churchLabel,
      detail:
        orgLayers.length === 0
          ? `Root of "${churchLabel}" — ${cellLabel} groups report directly to the church.`
          : `Root of "${churchLabel}" — ${orgLayers[0]?.displayName ?? 'your first layer'} groups report up to here.`,
    },
  ]

  orgLayers.forEach((layer, index) => {
    const parentLabel = index === 0 ? churchLabel : orgLayers[index - 1].displayName
    const childLabel =
      index === orgLayers.length - 1 ? cellLabel : orgLayers[index + 1].displayName
    items.push({
      kind: 'layer',
      label: layer.displayName,
      detail: `Each ${layer.displayName} sits under ${parentLabel} and contains one or more ${childLabel} groups.`,
    })
  })

  if (cellLayer) {
    items.push({
      kind: 'cell',
      label: cellLabel,
      detail: `Members are assigned to a ${cellLabel} — the smallest group in your ${orgLayers.length + 1}-layer setup.`,
    })
  }

  items.push({
    kind: 'member',
    label: 'Member',
    detail: `A person at ${churchLabel} belongs to exactly one ${cellLabel}, then rolls up through your chain.`,
  })

  return items
}

function buildIntro(
  churchLabel: string,
  structureName: string | null | undefined,
  layers: StructureLayerInput[],
): string {
  const orgCount = Math.max(0, layers.length - 1)
  const cellLabel = layers[layers.length - 1]?.displayName ?? 'Cell'
  const named = structureName?.trim() ? `"${structureName.trim()}"` : 'This structure'

  if (layers.length === 1) {
    return `${named} for ${churchLabel}: members go straight onto ${cellLabel} groups — no layers in between.`
  }

  const layerNames = layers.map((l) => l.displayName).join(' → ')
  return `${named} for ${churchLabel}: ${orgCount} org layer${orgCount === 1 ? '' : 's'} (${layerNames}) before members.`
}

export function StructureChainPreviewDialog({
  open,
  onOpenChange,
  churchName,
  structureName,
  layers,
}: StructureChainPreviewDialogProps) {
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

  const churchLabel = churchName?.trim() || 'Your church'
  const cellLayer = layers[layers.length - 1]
  const cellLabel = cellLayer?.displayName ?? 'Cell'
  const breakdown = buildBreakdown(churchLabel, layers)
  const intro = buildIntro(churchLabel, structureName, layers)
  const chainLabel = [churchLabel, ...layers.map((l) => l.displayName), 'Member'].join(' → ')

  const nodes: PreviewNode[] = [
    { id: 'church', label: churchLabel, subtitle: 'Church', kind: 'church' },
    ...layers.map((layer, index) => ({
      id: `layer-${index}`,
      label: layer.displayName,
      subtitle: layer.standardType,
      kind: 'layer' as const,
    })),
    { id: 'member', label: 'Member', subtitle: 'Person', kind: 'member' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/45"
            aria-label="Close preview"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="structure-preview-title"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative z-10 w-full max-w-2xl rounded-xl border bg-background shadow-xl"
          >
            <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 id="structure-preview-title" className="text-base font-semibold tracking-tight">
                  {structureName?.trim() || 'Your structure'}
                </h2>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{intro}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </header>

            <motion.div
              variants={previewStagger}
              initial="hidden"
              animate="show"
              className="space-y-4 px-5 py-4"
            >
              <motion.p
                variants={fadeUp}
                className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground"
              >
                <span className="font-medium text-foreground">{chainLabel}</span>
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="overflow-x-auto rounded-lg border border-border/60 bg-muted/15 p-4"
              >
                <div className="flex min-w-min items-center justify-center gap-0.5">
                  {nodes.map((node, index) => (
                    <div key={node.id} className="flex items-center">
                      {index > 0 && <PreviewArrow index={index} />}
                      <PreviewNodeCard node={node} index={index} />
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="space-y-2">
                <p className="text-xs font-medium text-foreground">What you set up</p>
                <ul className="space-y-2">
                  {breakdown.map((item, index) => (
                    <BreakdownRow key={item.label} item={item} index={index} />
                  ))}
                </ul>
              </motion.div>

              <motion.p variants={fadeUp} className="text-xs leading-relaxed text-muted-foreground">
                When you finish setup, you&apos;ll create{' '}
                {layers.length === 1 ? (
                  <>
                    <span className="font-medium text-foreground">{cellLabel}</span> groups under{' '}
                    <span className="font-medium text-foreground">{churchLabel}</span>
                  </>
                ) : (
                  <>
                    {layers
                      .map((l) => l.displayName)
                      .slice(0, -1)
                      .map((name, i, arr) => (
                        <span key={name}>
                          <span className="font-medium text-foreground">{name}</span>
                          {i < arr.length - 1 ? ', then ' : ', then '}
                        </span>
                      ))}
                    <span className="font-medium text-foreground">{cellLabel}</span> groups, and
                    place members on each <span className="font-medium text-foreground">{cellLabel}</span>.
                  </>
                )}
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function BreakdownRow({ item, index }: { item: LayerBreakdown; index: number }) {
  const Icon =
    item.kind === 'church' ? Building2 : item.kind === 'member' ? UserRound : Layers

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + index * 0.06, duration: 0.3, ease: authEase }}
      className="flex gap-2.5 rounded-lg border border-border/50 bg-background px-3 py-2"
    >
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md',
          item.kind === 'church' && 'bg-muted text-muted-foreground',
          item.kind === 'layer' && 'bg-muted/80 text-foreground',
          item.kind === 'cell' && 'bg-primary/10 text-primary',
          item.kind === 'member' && 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{item.label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
      </div>
    </motion.li>
  )
}

function PreviewNodeCard({ node, index }: { node: PreviewNode; index: number }) {
  const Icon = node.kind === 'church' ? Building2 : node.kind === 'member' ? UserRound : Layers

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: 0.12 + index * 0.07,
        type: 'spring',
        stiffness: 420,
        damping: 28,
      }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn(
        'flex min-w-[5.25rem] flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-center shadow-sm',
        node.kind === 'church' && 'border-border/60 bg-muted/50 text-muted-foreground',
        node.kind === 'layer' && 'border-border/50 bg-background text-foreground',
        node.kind === 'member' && 'border-primary/35 bg-primary/10 text-primary ring-1 ring-primary/10',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="max-w-[6.5rem] truncate text-xs font-medium">{node.label}</span>
      {node.subtitle && (
        <span className="text-[10px] text-muted-foreground">{node.subtitle}</span>
      )}
    </motion.div>
  )
}

function PreviewArrow({ index }: { index: number }) {
  return (
    <motion.svg
      width="36"
      height="20"
      viewBox="0 0 36 20"
      fill="none"
      aria-hidden
      className="shrink-0 text-muted-foreground/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.2 }}
    >
      <motion.path
        d="M2 10 H26"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.14 + index * 0.07, duration: 0.35, ease: authEase }}
      />
      <motion.path
        d="M22 5 L30 10 L22 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.28 + index * 0.07, duration: 0.25, ease: authEase }}
      />
    </motion.svg>
  )
}
