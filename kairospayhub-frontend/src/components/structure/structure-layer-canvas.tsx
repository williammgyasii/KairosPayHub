import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Building2, Plus, Trash2, UserRound } from 'lucide-react'
import {
  LAYER_TYPE_OPTIONS,
  type StructureLayerInput,
  type StructureLayerType,
} from '@/api/structure'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface StructureLayerCanvasProps {
  churchName?: string | null
  layers: StructureLayerInput[]
  selectedIndex: number | null
  onSelectIndex: (index: number | null) => void
  onChangeLayer: (index: number, patch: Partial<StructureLayerInput>) => void
  onInsertAt: (index: number) => void
  onRemoveAt: (index: number) => void
  compact?: boolean
}

export function StructureLayerCanvas({
  churchName,
  layers,
  selectedIndex,
  onSelectIndex,
  onChangeLayer,
  onInsertAt,
  onRemoveAt,
  compact = false,
}: StructureLayerCanvasProps) {
  const cellIndex = layers.length - 1

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-center gap-0 overflow-x-auto rounded-lg border border-border/60 bg-muted/20 px-2 py-3',
          compact ? 'min-h-[4.5rem]' : 'min-h-[5.5rem]',
        )}
      >
        <FixedNode
          icon={Building2}
          label={churchName?.trim() || 'Church'}
          tone="church"
          compact={compact}
        />

        <AnimatePresence mode="popLayout" initial={false}>
          {layers.map((layer, index) => (
            <motion.div
              key={`layer-slot-${index}-${layer.standardType}-${layer.displayName}`}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className="flex items-center"
            >
              <InsertConnector compact={compact} onInsert={() => onInsertAt(index)} />
              <LayerNode
                layer={layer}
                index={index}
                isCell={index === cellIndex}
                selected={selectedIndex === index}
                canRemove={layers.length > 1 && index !== cellIndex}
                compact={compact}
                onSelect={() => onSelectIndex(selectedIndex === index ? null : index)}
                onRemove={() => onRemoveAt(index)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <FlowArrow compact={compact} />
        <FixedNode icon={UserRound} label="Member" tone="member" compact={compact} />
      </div>

      <AnimatePresence mode="wait">
        {selectedIndex !== null && layers[selectedIndex] && (
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <LayerEditor
              layer={layers[selectedIndex]}
              isCell={selectedIndex === cellIndex}
              canRemove={layers.length > 1 && selectedIndex !== cellIndex}
              onChange={(patch) => onChangeLayer(selectedIndex, patch)}
              onRemove={() => {
                onRemoveAt(selectedIndex)
                onSelectIndex(null)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FixedNode({
  icon: Icon,
  label,
  tone,
  compact,
}: {
  icon: typeof Building2
  label: string
  tone: 'church' | 'member'
  compact?: boolean
}) {
  return (
    <motion.div
      layout
      className={cn(
        'flex shrink-0 flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-center',
        compact ? 'min-w-[4.5rem]' : 'min-w-[5.5rem]',
        tone === 'church'
          ? 'border-border/60 bg-muted/40 text-muted-foreground'
          : 'border-primary/30 bg-primary/10 text-primary',
      )}
    >
      <Icon className={cn('shrink-0', compact ? 'size-3.5' : 'size-4')} />
      <span className={cn('max-w-[5rem] truncate font-medium', compact ? 'text-[10px]' : 'text-xs')}>
        {label}
      </span>
    </motion.div>
  )
}

function LayerNode({
  layer,
  index,
  isCell,
  selected,
  canRemove,
  compact,
  onSelect,
  onRemove,
}: {
  layer: StructureLayerInput
  index: number
  isCell: boolean
  selected: boolean
  canRemove: boolean
  compact?: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  return (
    <div className="group/node relative shrink-0">
      <motion.button
        type="button"
        layout
        initial={false}
        onClick={onSelect}
        className={cn(
          'flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-center transition-shadow',
          compact ? 'min-w-[4.5rem]' : 'min-w-[5.5rem]',
          selected
            ? 'border-primary bg-background shadow-md ring-2 ring-primary/20'
            : 'border-border/50 bg-background hover:border-primary/40 hover:shadow-sm',
        )}
      >
        <span
          className={cn(
            'rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground',
            compact ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          {isCell ? 'Cell' : layer.standardType}
        </span>
        <span className={cn('max-w-[5rem] truncate font-medium', compact ? 'text-[10px]' : 'text-xs')}>
          {layer.displayName}
        </span>
        <span className="sr-only">Layer {index + 1}</span>
      </motion.button>

      {canRemove && (
        <motion.button
          type="button"
          layout
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn(
            'absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full border border-destructive/30 bg-background text-destructive shadow-sm transition-opacity hover:bg-destructive/10',
            compact ? 'size-4' : 'size-5',
            selected ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100',
          )}
          aria-label={`Remove ${layer.displayName} layer`}
        >
          <Trash2 className={compact ? 'size-2.5' : 'size-3'} />
        </motion.button>
      )}
    </div>
  )
}

function InsertConnector({ onInsert, compact }: { onInsert: () => void; compact?: boolean }) {
  return (
    <div
      className={cn(
        'group relative flex shrink-0 items-center justify-center',
        compact ? 'w-7' : 'w-9',
      )}
    >
      <div className="h-px w-full bg-gradient-to-r from-border/40 via-border to-border/40 transition-colors group-hover:via-primary/40" />
      <motion.button
        type="button"
        layout
        initial={{ scale: 0.6, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
        onClick={onInsert}
        className={cn(
          'absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-primary/35 bg-background text-primary/70 shadow-sm transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary',
          compact ? 'size-5' : 'size-6',
        )}
        aria-label="Insert layer here"
      >
        <Plus className={compact ? 'size-3' : 'size-3.5'} />
      </motion.button>
    </div>
  )
}

function FlowArrow({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center text-muted-foreground/70',
        compact ? 'w-5 px-0.5' : 'w-7 px-1',
      )}
    >
      <ArrowRight className={compact ? 'size-3.5' : 'size-4'} strokeWidth={2} />
    </div>
  )
}

function LayerEditor({
  layer,
  isCell,
  canRemove,
  onChange,
  onRemove,
}: {
  layer: StructureLayerInput
  isCell: boolean
  canRemove: boolean
  onChange: (patch: Partial<StructureLayerInput>) => void
  onRemove: () => void
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border/50 bg-background p-2 sm:grid-cols-[1fr_1fr_auto]">
      <div className="space-y-1">
        <Label className="text-xs">Standard type</Label>
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          value={layer.standardType}
          disabled={isCell}
          onChange={(e) =>
            onChange({
              standardType: e.target.value as StructureLayerType,
              displayName:
                isCell
                  ? 'Cell'
                  : layer.displayName === 'Cell'
                    ? e.target.value
                    : layer.displayName,
            })
          }
        >
          {LAYER_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type} disabled={isCell && type !== 'Cell'}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Display name</Label>
        <Input
          className="h-8 text-xs"
          value={layer.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          required
        />
      </div>
      <div className="flex items-end justify-end gap-1">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Remove layer
          </button>
        )}
      </div>
    </div>
  )
}
