import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Minus } from 'lucide-react'
import { useStructureCanvasActions } from '@/components/structure/structure-canvas-context'
import { cn } from '@/lib/utils'
import type { StructureNodeData, StructureNodeKind } from '@/lib/structure-flow'

const KIND_LABEL: Record<StructureNodeKind, string> = {
  church: 'Church',
  group: 'Group',
  pfcc: 'PFCC',
  fellowship: 'Fellowship',
  cell: 'Cell',
  member: 'Member',
}

const KIND_STYLE: Record<StructureNodeKind, string> = {
  church: 'border-primary/40 bg-primary/5 text-primary',
  group: 'border-border bg-muted/30',
  pfcc: 'border-border bg-muted/30',
  fellowship: 'border-border bg-background',
  cell: 'border-border bg-background',
  member: 'border-border bg-background',
}

export function StructureFlowNode({ data, selected }: NodeProps<Node<StructureNodeData>>) {
  const horizontal = data.layout === 'horizontal'
  const { editable, busy, onRemoveAt } = useStructureCanvasActions()

  const targetPosition = horizontal ? Position.Left : Position.Top
  const sourcePosition = horizontal ? Position.Right : Position.Bottom

  const showTarget = data.kind !== 'church'
  const showSource = data.kind !== 'member'
  const showRemove =
    editable && data.canRemove && data.layerIndex !== undefined && data.kind !== 'member'

  return (
    <div className="group/node relative">
      <div
        className={cn(
          'min-w-[128px] max-w-[160px] rounded-xl border px-3 py-2 text-center shadow-sm transition-shadow',
          KIND_STYLE[data.kind],
          selected && 'ring-2 ring-primary/30',
          data.pending && 'border-dashed border-amber-400/80 bg-amber-50/50 dark:bg-amber-950/20',
          data.definitionOnly && 'border-dashed bg-muted/20 shadow-none',
          data.definitionOnly && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {showTarget && (
          <Handle
            type="target"
            position={targetPosition}
            className="!size-2.5 !border-2 !border-background !bg-primary"
          />
        )}

        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {data.definitionOnly
            ? data.kind === 'church'
              ? 'Church'
              : data.kind === 'member'
                ? 'Leaf'
                : 'Layer'
            : KIND_LABEL[data.kind]}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold">{data.label}</p>
        {data.definitionOnly && data.standardType && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{data.standardType}</p>
        )}
        {data.pending && (
          <p className="mt-1 text-[10px] font-medium text-amber-700">Connect to save</p>
        )}

        {showSource && (
          <Handle
            type="source"
            position={sourcePosition}
            className="!size-2.5 !border-2 !border-background !bg-primary"
          />
        )}
      </div>

      {showRemove && (
        <button
          type="button"
          disabled={busy}
          aria-label={`Remove ${data.label} layer`}
          onClick={(e) => {
            e.stopPropagation()
            onRemoveAt(data.layerIndex!)
          }}
          className={cn(
            'absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-destructive/40 bg-background text-destructive shadow-sm transition-opacity hover:bg-destructive/10',
            selected ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100',
            busy && 'cursor-not-allowed opacity-50',
          )}
        >
          <Minus className="size-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
