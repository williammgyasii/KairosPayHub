import type { Edge, Node } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { getDeepestLayer, getLayers, nodesAtLayer } from '@/lib/structure-tree'

export type StructureNodeKind = 'church' | 'group' | 'pfcc' | 'fellowship' | 'cell' | 'member'

export type StructureNodeData = {
  kind: StructureNodeKind
  label: string
  entityId?: string
  pending?: boolean
  layerId?: string
  standardType?: string
  definitionOnly?: boolean
  layout?: 'horizontal' | 'vertical'
  layerIndex?: number
  canRemove?: boolean
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
        data: {
          kind,
          label: node.name,
          entityId: node.id,
          layerId: layer.id,
          standardType: layer.standardType,
        },
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

export function templateToFlow(
  tree: StructureTree,
  positions: Record<string, { x: number; y: number }> = {},
  options?: { allowRemove?: boolean },
): {
  nodes: Node<StructureNodeData>[]
  edges: Edge[]
} {
  const nodes: Node<StructureNodeData>[] = []
  const edges: Edge[] = []
  const layers = getLayers(tree)
  const X_GAP = 200
  const Y = 0

  const edgeDefaults = {
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: 'var(--primary)',
    },
    style: { strokeWidth: 2, stroke: 'var(--primary)' },
  }

  const churchNodeId = nodeId('church', tree.churchId)
  nodes.push({
    id: churchNodeId,
    type: 'structure',
    position: pos(positions, churchNodeId, { x: 0, y: Y }),
    data: {
      kind: 'church',
      label: tree.churchName,
      entityId: tree.churchId,
      definitionOnly: true,
      layout: 'horizontal',
    },
    draggable: true,
    selectable: true,
  })

  layers.forEach((layer, index) => {
    const kind = kindForStandardType(layer.standardType)
    const id = `layer-def:${layer.id}`
    const x = (index + 1) * X_GAP
    const cellIndex = layers.length - 1

    nodes.push({
      id,
      type: 'structure',
      position: pos(positions, id, { x, y: Y }),
      data: {
        kind,
        label: layer.displayName,
        layerId: layer.id,
        standardType: layer.standardType,
        definitionOnly: true,
        layout: 'horizontal',
        layerIndex: index,
        canRemove:
          (options?.allowRemove ?? false) && layers.length > 1 && index !== cellIndex,
      },
      draggable: true,
      selectable: true,
    })

    const sourceId = index === 0 ? churchNodeId : `layer-def:${layers[index - 1]!.id}`
    edges.push({
      id: `e-${sourceId}-${id}`,
      source: sourceId,
      target: id,
      type: 'skeleton',
      data: { insertAt: index },
      ...edgeDefaults,
    })
  })

  const memberId = 'layer-def:member'
  const memberX = (layers.length + 1) * X_GAP
  const lastSource =
    layers.length > 0 ? `layer-def:${layers[layers.length - 1]!.id}` : churchNodeId

  nodes.push({
    id: memberId,
    type: 'structure',
    position: pos(positions, memberId, { x: memberX, y: Y }),
    data: { kind: 'member', label: 'Member', definitionOnly: true, layout: 'horizontal' },
    draggable: true,
    selectable: true,
  })
  edges.push({
    id: `e-${lastSource}-${memberId}`,
    source: lastSource,
    target: memberId,
    type: 'skeleton',
    data: { insertAt: layers.length },
    ...edgeDefaults,
  })

  return { nodes, edges }
}

export function isValidStructureConnection(
  tree: StructureTree,
  source: StructureNodeData,
  target: StructureNodeData,
) {
  if (target.definitionOnly || source.definitionOnly) return false

  if (target.kind === 'member') {
    const deepest = getDeepestLayer(tree)
    if (!deepest) return false
    return source.layerId === deepest.id
  }

  if (source.kind === 'church') {
    const first = getLayers(tree)[0]
    return first != null && target.layerId === first.id
  }

  if (!source.layerId || !target.layerId) return false

  const layers = getLayers(tree)
  const sourceLayer = layers.find((l) => l.id === source.layerId)
  const targetLayer = layers.find((l) => l.id === target.layerId)
  if (!sourceLayer || !targetLayer) return false

  return targetLayer.sortOrder === sourceLayer.sortOrder + 1
}

export function skeletonLayoutStorageKey(churchId: string) {
  return `kph-structure-skeleton-layout-${churchId}`
}

export function readSkeletonPositions(churchId: string) {
  try {
    const raw = localStorage.getItem(skeletonLayoutStorageKey(churchId))
    return raw ? (JSON.parse(raw) as Record<string, { x: number; y: number }>) : {}
  } catch {
    return {}
  }
}

export function writeSkeletonPositions(churchId: string, nodes: Node<StructureNodeData>[]) {
  const positions = Object.fromEntries(nodes.map((n) => [n.id, n.position]))
  localStorage.setItem(skeletonLayoutStorageKey(churchId), JSON.stringify(positions))
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

export function createPendingNodeFromLayer(
  layer: StructureLayer,
  position: { x: number; y: number },
): Node<StructureNodeData> {
  const kind = kindForStandardType(layer.standardType)
  const id = nodeId(kind, crypto.randomUUID())
  return {
    id,
    type: 'structure',
    position,
    data: {
      kind,
      label: `New ${layer.displayName}`,
      pending: true,
      layerId: layer.id,
      standardType: layer.standardType,
    },
    draggable: true,
  }
}

export function createPendingMemberNode(
  position: { x: number; y: number },
): Node<StructureNodeData> {
  const id = nodeId('member', crypto.randomUUID())
  return {
    id,
    type: 'structure',
    position,
    data: { kind: 'member', label: 'New member', pending: true },
    draggable: true,
  }
}
