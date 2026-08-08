import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus } from 'lucide-react'
import { useApi } from '@/api/useApi'
import type { StructureTree } from '@/api/structure'
import { StructureFlowNode } from '@/components/structure/structure-node'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createPendingNode,
  isValidStructureConnection,
  parseNodeKind,
  readSavedPositions,
  treeToFlow,
  writeSavedPositions,
  type StructureNodeData,
  type StructureNodeKind,
} from '@/lib/structure-flow'
import { cn } from '@/lib/utils'

const nodeTypes = { structure: StructureFlowNode }

const PALETTE: { kind: StructureNodeKind; label: string; hint: string }[] = [
  { kind: 'pfcc', label: 'PFCC', hint: 'Optional grouping layer' },
  { kind: 'fellowship', label: 'Fellowship', hint: 'Connect to church or PFCC' },
  { kind: 'cell', label: 'Cell', hint: 'Connect to a fellowship' },
  { kind: 'member', label: 'Member', hint: 'Connect to a cell' },
]

interface StructureCanvasProps {
  tree: StructureTree | null
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onDone?: () => void
}

export function StructureCanvas(props: StructureCanvasProps) {
  return (
    <ReactFlowProvider>
      <StructureCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function StructureCanvasInner({ tree, error, busy, submit, onDone }: StructureCanvasProps) {
  const api = useApi()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StructureNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [pendingNodes, setPendingNodes] = useState<Node<StructureNodeData>[]>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const [adding, setAdding] = useState<StructureNodeKind | null>(null)
  const [newName, setNewName] = useState('')
  const flowRef = useRef<ReactFlowInstance<Node<StructureNodeData>, Edge> | null>(null)

  useEffect(() => {
    if (!tree) return

    const saved = readSavedPositions(tree.churchId)
    const { nodes: treeNodes, edges: treeEdges } = treeToFlow(tree, saved)
    setNodes([...treeNodes, ...pendingNodes])
    setEdges(treeEdges)
    requestAnimationFrame(() => {
      flowRef.current?.fitView({ padding: 0.2, duration: 200 })
    })
  }, [tree, pendingNodes, setNodes, setEdges])

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node<StructureNodeData>) => {
      if (!tree) return
      setPendingNodes((pending) => pending.map((n) => (n.id === node.id ? node : n)))
      setNodes((prev) => {
        writeSavedPositions(tree.churchId, prev)
        return prev
      })
    },
    [setNodes, tree],
  )

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const sourceKind = parseNodeKind(connection.source ?? '')
    const targetKind = parseNodeKind(connection.target ?? '')
    if (!sourceKind || !targetKind) return false
    return isValidStructureConnection(sourceKind, targetKind)
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!tree || !connection.source || !connection.target) return

      const sourceKind = parseNodeKind(connection.source)
      const targetKind = parseNodeKind(connection.target)
      if (!sourceKind || !targetKind) return
      if (!isValidStructureConnection(sourceKind, targetKind)) {
        setLocalError('That connection is not allowed.')
        return
      }

      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return

      void submit(async () => {
        setLocalError(null)

        if (sourceKind === 'church' && targetKind === 'pfcc') {
          return
        }

        if (sourceKind === 'church' && targetKind === 'fellowship') {
          await api.patch(`/api/structure/fellowships/${targetNode.data.entityId}/link`, {
            pfccId: null,
          })
          return
        }

        if (sourceKind === 'pfcc' && targetKind === 'fellowship') {
          await api.patch(`/api/structure/fellowships/${targetNode.data.entityId}/link`, {
            pfccId: sourceNode.data.entityId,
          })
          return
        }

        if (sourceKind === 'fellowship' && targetKind === 'cell') {
          if (targetNode.data.pending) {
            await api.post('/api/structure/cells', {
              name: targetNode.data.label,
              fellowshipId: sourceNode.data.entityId,
            })
            setPendingNodes((pending) => pending.filter((n) => n.id !== targetNode.id))
          } else {
            await api.patch(`/api/structure/cells/${targetNode.data.entityId}/link`, {
              fellowshipId: sourceNode.data.entityId,
            })
          }
          return
        }

        if (sourceKind === 'cell' && targetKind === 'member') {
          if (targetNode.data.pending) {
            await api.post('/api/structure/members', {
              name: targetNode.data.label,
              cellId: sourceNode.data.entityId,
            })
            setPendingNodes((pending) => pending.filter((n) => n.id !== targetNode.id))
          } else {
            await api.patch(`/api/structure/members/${targetNode.data.entityId}/link`, {
              cellId: sourceNode.data.entityId,
            })
          }
        }
      }).catch((err) => {
        setLocalError(err instanceof Error ? err.message : 'Connection failed')
      })
    },
    [api, nodes, submit, tree],
  )

  async function addNode(kind: StructureNodeKind, name: string) {
    if (!tree) return
    setLocalError(null)

    if (kind === 'cell' || kind === 'member') {
      setPendingNodes((pending) => [...pending, createPendingNode(kind, name)])
      return
    }

    await submit(async () => {
      if (kind === 'pfcc') {
        await api.post('/api/structure/pfccs', { name })
      } else if (kind === 'fellowship') {
        await api.post('/api/structure/fellowships', { name, pfccId: null })
      }
    })
  }

  function startAdd(kind: StructureNodeKind) {
    setAdding(kind)
    setNewName('')
  }

  function confirmAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!adding || !newName.trim()) return
    void addNode(adding, newName.trim()).finally(() => {
      setAdding(null)
      setNewName('')
    })
  }

  const displayError = localError ?? error

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex flex-col border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Structure builder</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add nodes, then drag from the bottom handle to connect them.
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground sm:mt-0">PFCC is optional — connect fellowships straight to church.</p>
      </div>

      <div className="flex flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col gap-2 border-b border-border/60 p-4 lg:w-56 lg:border-b-0 lg:border-r">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Add nodes</p>
          {PALETTE.map((item) => (
            <button
              key={item.kind}
              type="button"
              disabled={busy || !tree}
              onClick={() => startAdd(item.kind)}
              className={cn(
                'rounded-lg border border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent/60',
                adding === item.kind && 'border-primary/40 bg-primary/5',
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Plus className="size-3.5" />
                {item.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span>
            </button>
          ))}

          {adding && (
            <form onSubmit={confirmAdd} className="space-y-2 border-t border-border/60 pt-3">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`${adding} name`}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={busy}>
                  Add
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </aside>

        <div className="relative min-h-[520px] flex-1 bg-muted/10">
          {!tree ? (
            <div className="flex h-full min-h-[520px] items-center justify-center text-sm text-muted-foreground">
              Loading structure…
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onInit={(instance) => {
                flowRef.current = instance
              }}
              isValidConnection={isValidConnection}
              nodeTypes={nodeTypes}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>
      </div>

      {displayError && (
        <p className="border-t border-border/60 px-5 py-3 text-sm text-destructive">{displayError}</p>
      )}

      {onDone && (
        <div className="flex justify-end border-t border-border/60 px-5 py-3">
          <Button onClick={onDone} disabled={busy}>
            Done — back to overview
          </Button>
        </div>
      )}
    </section>
  )
}
