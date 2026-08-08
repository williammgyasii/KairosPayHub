import type { Edge, Node } from '@xyflow/react'
import type { StructureTree } from '@/api/structure'
import { getLayers, nodesAtLayer } from '@/lib/structure-tree'

export type StructureNodeKind = 'church' | 'group' | 'pfcc' | 'fellowship' | 'cell' | 'member'

export type StructureNodeData = {
  kind: StructureNodeKind
  label: string
  entityId?: string
  pending?: boolean
}

function kindForStandardType(type: string): StructureNodeKind {
  const lower = type.toLowerCase()
  if (lower === 'group') return 'group'
  if (lower === 'pfcc') return 'pfcc'
  if (lower === 'fellowship') return 'fellowship'
  if (lower === 'cell') return 'cell'
  return 'fellowship'
}

function nodeId(kind: StructureNodeKind, id: string) {
  return `${kind}:${id}`
}

function spreadX(count: number, index: number) {
  const X_GAP = 170
  if (count <= 1) return 0
  const total = (count - 1) * X_GAP
  return -total / 2 + index * X_GAP
}

function pos(
  positions: Record<string, { x: number; y: number }>,
  id: string,
  fallback: { x: number; y: number },
) {
  return positions[id] ?? fallback
}

export function parseNodeKind(id: string): StructureNodeKind | null {
  const kind = id.split(':')[0]
  if (
    kind === 'church' ||
    kind === 'group' ||
    kind === 'pfcc' ||
    kind === 'fellowship' ||
    kind === 'cell' ||
    kind === 'member'
  ) {
    return kind
  }
  return null
}

export { nodeId }

export function treeToFlow(
  tree: StructureTree,
  positions: Record<string, { x: number; y: number }> = {},
): { nodes: Node<StructureNodeData>[]; edges: Edge[] } {
  const nodes: Node<StructureNodeData>[] = []
  const edges: Edge[] = []
  const layers = getLayers(tree)

  const churchNodeId = nodeId('church', tree.churchId)
  nodes.push({
    id: churchNodeId,
    type: 'structure',
    position: pos(positions, churchNodeId, { x: 0, y: 0 }),
    data: { kind: 'church', label: tree.churchName, entityId: tree.churchId },
    draggable: true,
  })

  layers.forEach((layer) => {
    const layerNodes = nodesAtLayer(tree, layer.id)
    const kind = kindForStandardType(layer.standardType)
    const y = (layer.sortOrder + 1) * 120

    layerNodes.forEach((node, index) => {
      const id = nodeId(kind, node.id)
      nodes.push({
        id,
        type: 'structure',
        position: pos(positions, id, { x: spreadX(layerNodes.length, index), y }),
        data: { kind, label: node.name, entityId: node.id },
        draggable: true,
      })

      const sourceId = node.parentNodeId
        ? nodeId(kindForStandardType(layers[layer.sortOrder - 1]?.standardType ?? 'Fellowship'), node.parentNodeId)
        : churchNodeId

      edges.push({
        id: `e-${sourceId}-${id}`,
        source: sourceId,
        target: id,
      })
    })
  })

  const deepest = layers[layers.length - 1]
  if (deepest) {
    const memberY = (layers.length + 1) * 120
    tree.members.forEach((member, index) => {
      const id = nodeId('member', member.id)
      nodes.push({
        id,
        type: 'structure',
        position: pos(positions, id, { x: spreadX(tree.members.length, index), y: memberY }),
        data: { kind: 'member', label: member.name, entityId: member.id },
        draggable: true,
      })
      edges.push({
        id: `e-${nodeId('cell', member.parentNodeId)}-${id}`,
        source: nodeId('cell', member.parentNodeId),
        target: id,
      })
    })
  }

  return { nodes, edges }
}

export function isValidStructureConnection(
  sourceKind: StructureNodeKind,
  targetKind: StructureNodeKind,
) {
  if (sourceKind === 'church') return targetKind !== 'member' && targetKind !== 'church'
  if (targetKind === 'member') return sourceKind === 'cell'
  return sourceKind !== 'member' && targetKind !== 'church'
}

export function layoutStorageKey(churchId: string) {
  return `kph-structure-layout-${churchId}`
}

export function readSavedPositions(churchId: string) {
  try {
    const raw = localStorage.getItem(layoutStorageKey(churchId))
    return raw ? (JSON.parse(raw) as Record<string, { x: number; y: number }>) : {}
  } catch {
    return {}
  }
}

export function writeSavedPositions(churchId: string, nodes: Node<StructureNodeData>[]) {
  const positions = Object.fromEntries(nodes.map((n) => [n.id, n.position]))
  localStorage.setItem(layoutStorageKey(churchId), JSON.stringify(positions))
}

export function createPendingNode(kind: 'cell' | 'member', name: string): Node<StructureNodeData> {
  const id = nodeId(kind, crypto.randomUUID())
  return {
    id,
    type: 'structure',
    position: { x: 0, y: 400 },
    data: { kind, label: name, pending: true },
    draggable: true,
  }
}
