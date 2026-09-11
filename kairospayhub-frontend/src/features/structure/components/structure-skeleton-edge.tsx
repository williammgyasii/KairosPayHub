import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useStructureCanvasActions } from '@/features/structure/components/structure-canvas-context'
import { cn } from '@/shared/lib/utils'

export type StructureSkeletonEdgeData = {
  insertAt: number
}

export function StructureSkeletonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}: EdgeProps) {
  const { editable, busy, onInsertAt } = useStructureCanvasActions()
  const insertAt = (data as StructureSkeletonEdgeData | undefined)?.insertAt ?? 0

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {editable && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <button
              type="button"
              disabled={busy}
              aria-label="Insert layer here"
              onClick={(e) => {
                e.stopPropagation()
                onInsertAt(insertAt)
              }}
              className={cn(
                'flex size-7 items-center justify-center rounded-full border border-primary/35 bg-background text-primary shadow-sm transition-colors',
                busy
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-primary hover:bg-primary/10 hover:shadow-md',
              )}
            >
              <Plus className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
