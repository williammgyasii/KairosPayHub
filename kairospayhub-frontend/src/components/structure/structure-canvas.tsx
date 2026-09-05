import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { StructureTree } from '@/api/structure'
import {
  StructureCanvasProvider,
  type StructureCanvasActions,
} from '@/components/structure/structure-canvas-context'
import { StructureFlowNode } from '@/components/structure/structure-node'
import { StructureSkeletonEdge } from '@/components/structure/structure-skeleton-edge'
import {
  readSkeletonPositions,
  templateToFlow,
  writeSkeletonPositions,
  type StructureNodeData,
} from '@/lib/structure-flow'

const nodeTypes = { structure: StructureFlowNode }
const edgeTypes = { skeleton: StructureSkeletonEdge }

interface StructureCanvasProps {
  tree: StructureTree
  editable?: boolean
  allowRemove?: boolean
  busy?: boolean
  onInsertAt?: (insertAt: number) => void
  onRemoveAt?: (layerIndex: number) => void
  onEditLayer?: (layerIndex: number | null) => void
}

export function StructureCanvas(props: StructureCanvasProps) {
  return (
    <ReactFlowProvider>
      <StructureSkeletonCanvas {...props} />
    </ReactFlowProvider>
  )
}

function StructureSkeletonCanvas({
  tree,
  editable = false,
  allowRemove = false,
  busy = false,
  onInsertAt,
  onRemoveAt,
  onEditLayer,
}: StructureCanvasProps) {
  const initialFlow = useMemo(
    () => templateToFlow(tree, readSkeletonPositions(tree.churchId), { allowRemove }),
    [tree, allowRemove],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StructureNodeData>>(initialFlow.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialFlow.edges)
  const flowRef = useRef<ReactFlowInstance<Node<StructureNodeData>, Edge> | null>(null)
  const didDragRef = useRef(false)

  const templateName = tree.template?.name ?? 'Structure'

  const canvasActions = useMemo<StructureCanvasActions>(
    () => ({
      editable,
      busy,
      onInsertAt: onInsertAt ?? (() => undefined),
      onRemoveAt: onRemoveAt ?? (() => undefined),
      onEditLayer: onEditLayer ?? (() => undefined),
    }),
    [editable, busy, onInsertAt, onRemoveAt, onEditLayer],
  )

  useEffect(() => {
    const saved = readSkeletonPositions(tree.churchId)
    const flow = templateToFlow(tree, saved, { allowRemove })
    setNodes(flow.nodes)
    setEdges(flow.edges)
    const timer = window.setTimeout(() => {
      flowRef.current?.fitView({ padding: 0.2, duration: 250 })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [tree, allowRemove, setNodes, setEdges])

  const onNodeDragStart = useCallback(() => {
    didDragRef.current = true
  }, [])

  const onNodeDragStop = useCallback(() => {
    setNodes((current) => {
      writeSkeletonPositions(tree.churchId, current)
      return current
    })
    window.setTimeout(() => {
      didDragRef.current = false
    }, 0)
  }, [setNodes, tree.churchId])

  function handleNodeClick(_: unknown, node: Node<StructureNodeData>) {
    if (didDragRef.current || !editable || !onEditLayer) return
    if (node.data.kind === 'member') return
    if (node.data.layerIndex !== undefined) {
      onEditLayer(node.data.layerIndex)
      return
    }
    if (node.data.kind === 'church') {
      onEditLayer(null)
    }
  }

  return (
    <StructureCanvasProvider value={canvasActions}>
      <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-base font-semibold tracking-tight">{templateName}</h2>
            <span className="text-xs text-muted-foreground">{tree.churchName}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {editable
              ? 'Use + on connectors to add layers, − on a node to remove, click a node to edit. Drag to rearrange.'
              : 'Layer skeleton — view only. Pan on empty space or scroll to zoom.'}
          </p>
        </div>

        <div className="structure-flow-container relative h-[400px] w-full bg-muted/10 sm:h-[440px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onInit={(instance) => {
              flowRef.current = instance
              instance.fitView({ padding: 0.2 })
            }}
            nodesConnectable={false}
            nodesDraggable
            elementsSelectable={editable}
            panOnDrag
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            minZoom={0.35}
            maxZoom={1.75}
            defaultEdgeOptions={{
              type: 'skeleton',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: 'var(--primary)',
              },
              style: { strokeWidth: 2, stroke: 'var(--primary)' },
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            proOptions={{ hideAttribution: true }}
            className="structure-flow"
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </section>
    </StructureCanvasProvider>
  )
}
