import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
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
  const showTarget = data.kind !== 'church'
  const showSource = data.kind !== 'member'

  return (
    <div
      className={cn(
        'min-w-[128px] max-w-[160px] rounded-xl border px-3 py-2 text-center shadow-sm transition-shadow',
        KIND_STYLE[data.kind],
        selected && 'ring-2 ring-primary/30',
        data.pending && 'border-dashed border-amber-400/80 bg-amber-50/50',
      )}
    >
      {showTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2 !border-2 !border-background !bg-primary"
        />
      )}

      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {KIND_LABEL[data.kind]}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold">{data.label}</p>
      {data.pending && (
        <p className="mt-1 text-[10px] font-medium text-amber-700">Connect to save</p>
      )}

      {showSource && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2 !border-2 !border-background !bg-primary"
        />
      )}
    </div>
  )
}
