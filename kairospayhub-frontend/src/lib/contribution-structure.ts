import type { Contribution, GivingRollupRow } from '@/api/giving'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { getLayers, nodeById, parentChain } from '@/lib/structure-tree'

export type ContributionStructureOptions = {
  /** When set, views start one level below this node (leader's assigned unit). */
  scopeRootNodeId?: string | null
}

export function structureOptionsForLeader(
  role: string,
  scopeNodeId?: string | null,
): ContributionStructureOptions | undefined {
  if (!scopeNodeId || role === 'Pastor') return undefined
  if (role === 'PFCCManager' || role === 'FellowshipLeader') {
    return { scopeRootNodeId: scopeNodeId }
  }
  return undefined
}

export type ContributionStructureRow = Contribution & {
  structurePath: string
  fellowshipName: string
  unitName: string
}

export type ContributionTreeNode = {
  id: string
  name: string
  layerLabel: string
  depth: number
  totalAmount: number
  paymentCount: number
  children: ContributionTreeNode[]
  payments: ContributionStructureRow[]
}

export type MemberGivingHistory = {
  memberId: string
  memberName: string
  structurePath: string
  contributionCount: number
  approvedTotal: number
  pendingCount: number
  lastDateSent: string | null
  entries: ContributionStructureRow[]
}

function layerForNode(tree: StructureTree, node: StructureNode): StructureLayer | undefined {
  return getLayers(tree).find((l) => l.id === node.layerId)
}

function findAncestorByLayerType(
  tree: StructureTree,
  nodeId: string,
  layerType: StructureLayerType,
): StructureNode | undefined {
  for (const node of parentChain(tree, nodeId)) {
    if (layerForNode(tree, node)?.standardType === layerType) return node
  }
  return undefined
}

export function enrichContribution(
  tree: StructureTree | null,
  contribution: Contribution,
): ContributionStructureRow {
  if (!tree) {
    return {
      ...contribution,
      structurePath: '—',
      fellowshipName: 'Unassigned',
      unitName: '—',
    }
  }

  const unit = nodeById(tree, contribution.memberParentNodeId)
  const fellowship = findAncestorByLayerType(tree, contribution.memberParentNodeId, 'Fellowship')
  const pfc = findAncestorByLayerType(tree, contribution.memberParentNodeId, 'PFCC')
  const pathParts = [pfc?.name, fellowship?.name, unit?.name].filter(Boolean)

  return {
    ...contribution,
    structurePath: pathParts.join(' · ') || unit?.name || '—',
    fellowshipName: fellowship?.name ?? 'Unassigned',
    unitName: unit?.name ?? '—',
  }
}

function sortByDateDesc(rows: ContributionStructureRow[]) {
  return [...rows].sort(
    (a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime(),
  )
}

function structurePathNodes(
  tree: StructureTree,
  memberParentNodeId: string,
  options?: ContributionStructureOptions,
): StructureNode[] {
  const chain = parentChain(tree, memberParentNodeId)

  if (options?.scopeRootNodeId) {
    const scopeIndex = chain.findIndex((n) => n.id === options.scopeRootNodeId)
    if (scopeIndex < 0) return []
    return chain.slice(scopeIndex + 1)
  }

  const pfcIndex = chain.findIndex((n) => layerForNode(tree, n)?.standardType === 'PFCC')
  if (pfcIndex >= 0) return chain.slice(pfcIndex)
  return chain
}

/** Pick rollup rows for dashboard breakdown — scoped leaders see units below their scope. */
export function selectRollupBreakdownRows(
  rows: GivingRollupRow[],
  tree: StructureTree | null,
  options?: ContributionStructureOptions,
): GivingRollupRow[] {
  if (rows.length === 0) return rows

  if (options?.scopeRootNodeId && tree) {
    const scopeNode = nodeById(tree, options.scopeRootNodeId)
    const scopeLayer = scopeNode ? layerForNode(tree, scopeNode) : undefined
    const withoutScope = rows.filter((row) => row.nodeId !== options.scopeRootNodeId)
    if (withoutScope.length === 0) return rows

    if (scopeLayer) {
      const layers = getLayers(tree)
      const scopeIndex = layers.findIndex((layer) => layer.id === scopeLayer.id)
      const childLayerType = layers[scopeIndex + 1]?.standardType
      if (childLayerType) {
        const childRows = withoutScope.filter((row) => row.layerType === childLayerType)
        if (childRows.length > 0) return childRows
      }
    }

    return withoutScope
  }

  const pfcRows = rows.filter((row) => row.layerType === 'PFCC')
  if (pfcRows.length > 0) return pfcRows
  const fellowshipRows = rows.filter((row) => row.layerType === 'Fellowship')
  return fellowshipRows.length > 0 ? fellowshipRows : rows
}

function layerLabel(tree: StructureTree, node: StructureNode): string {
  const layer = layerForNode(tree, node)
  return layer?.displayName ?? layer?.standardType ?? 'Unit'
}

function ensureChild(
  parent: ContributionTreeNode,
  id: string,
  name: string,
  layerLabelValue: string,
  depth: number,
): ContributionTreeNode {
  let child = parent.children.find((c) => c.id === id)
  if (!child) {
    child = {
      id,
      name,
      layerLabel: layerLabelValue,
      depth,
      totalAmount: 0,
      paymentCount: 0,
      children: [],
      payments: [],
    }
    parent.children.push(child)
  }
  return child
}

function addTotals(node: ContributionTreeNode, amount: number) {
  node.totalAmount += amount
  node.paymentCount += 1
}

function sortTree(nodes: ContributionTreeNode[]): ContributionTreeNode[] {
  return nodes
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((node) => ({
      ...node,
      payments: sortByDateDesc(node.payments),
      children: sortTree(node.children),
    }))
}

/** PFCC → … → unit → member → payments (scoped leaders root at the level below their unit). */
export function buildContributionStructureTree(
  tree: StructureTree | null,
  contributions: Contribution[],
  options?: ContributionStructureOptions,
): ContributionTreeNode[] {
  if (!tree || contributions.length === 0) return []

  const roots = new Map<string, ContributionTreeNode>()

  for (const payment of contributions.map((c) => enrichContribution(tree, c))) {
    const path = structurePathNodes(tree, payment.memberParentNodeId, options)
    if (path.length === 0) continue

    const top = path[0]
    let current =
      roots.get(top.id) ??
      (() => {
        const node: ContributionTreeNode = {
          id: top.id,
          name: top.name,
          layerLabel: layerLabel(tree, top),
          depth: 0,
          totalAmount: 0,
          paymentCount: 0,
          children: [],
          payments: [],
        }
        roots.set(top.id, node)
        return node
      })()

    addTotals(current, payment.amount)

    for (let i = 1; i < path.length; i += 1) {
      const segment = path[i]
      current = ensureChild(
        current,
        segment.id,
        segment.name,
        layerLabel(tree, segment),
        i,
      )
      addTotals(current, payment.amount)
    }

    const memberNode = ensureChild(
      current,
      `member:${payment.memberId}`,
      payment.memberName,
      'Member',
      path.length,
    )
    addTotals(memberNode, payment.amount)
    memberNode.payments.push(payment)
  }

  return sortTree([...roots.values()])
}

export function groupContributionsByMember(
  tree: StructureTree | null,
  contributions: Contribution[],
): MemberGivingHistory[] {
  const byMember = new Map<string, MemberGivingHistory>()

  for (const row of contributions.map((c) => enrichContribution(tree, c))) {
    let member = byMember.get(row.memberId)
    if (!member) {
      member = {
        memberId: row.memberId,
        memberName: row.memberName,
        structurePath: row.structurePath,
        contributionCount: 0,
        approvedTotal: 0,
        pendingCount: 0,
        lastDateSent: null,
        entries: [],
      }
      byMember.set(row.memberId, member)
    }

    member.entries.push(row)
    member.contributionCount += 1
    if (row.status === 'Approved') member.approvedTotal += row.amount
    if (row.status === 'PendingApproval') member.pendingCount += 1
  }

  return [...byMember.values()]
    .map((member) => {
      const entries = sortByDateDesc(member.entries)
      return {
        ...member,
        entries,
        lastDateSent: entries[0]?.dateSent ?? null,
      }
    })
    .sort((a, b) => a.memberName.localeCompare(b.memberName))
}

export function findContributionTreeNodeWithPath(
  nodes: ContributionTreeNode[],
  nodeId: string,
  path: ContributionTreeNode[] = [],
): { node: ContributionTreeNode; path: ContributionTreeNode[] } | null {
  for (const node of nodes) {
    const nextPath = [...path, node]
    if (node.id === nodeId) return { node, path: nextPath }
    const found = findContributionTreeNodeWithPath(node.children, nodeId, nextPath)
    if (found) return found
  }
  return null
}

export function isMemberContributionNode(node: ContributionTreeNode): boolean {
  return node.id.startsWith('member:') || node.layerLabel === 'Member'
}

export function collectPaymentsInSubtree(node: ContributionTreeNode): ContributionStructureRow[] {
  const payments = [...node.payments]
  for (const child of node.children) {
    payments.push(...collectPaymentsInSubtree(child))
  }
  return sortByDateDesc(payments)
}

export function availableBreakdownLayers(node: ContributionTreeNode): string[] {
  const layers = new Set<string>()
  function walk(current: ContributionTreeNode) {
    for (const child of current.children) {
      layers.add(child.layerLabel)
      walk(child)
    }
  }
  walk(node)
  if (node.paymentCount > 0) layers.add('Member')
  return [...layers]
    .filter((layer) => layer !== node.layerLabel)
    .sort((a, b) => {
      const order = ['PFCC', 'Fellowship', 'Cell', 'Class', 'Member']
      const ai = order.findIndex((x) => a.includes(x) || a === x)
      const bi = order.findIndex((x) => b.includes(x) || b === x)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
}

export function aggregateSubtreeByLayer(
  node: ContributionTreeNode,
  targetLayerLabel: string,
): ContributionTreeNode[] {
  const merged = new Map<string, ContributionTreeNode>()

  function merge(source: ContributionTreeNode) {
    const existing = merged.get(source.id)
    if (!existing) {
      merged.set(source.id, {
        ...source,
        children: [],
        payments: [...source.payments],
      })
      return
    }
    existing.totalAmount += source.totalAmount
    existing.paymentCount += source.paymentCount
    existing.payments.push(...source.payments)
  }

  function walk(current: ContributionTreeNode) {
    if (targetLayerLabel === 'Member') {
      if (isMemberContributionNode(current)) merge(current)
    } else if (current.layerLabel === targetLayerLabel && current.id !== node.id) {
      merge(current)
    }
    for (const child of current.children) walk(child)
  }

  walk(node)

  return sortTree([...merged.values()].map((entry) => ({
    ...entry,
    payments: sortByDateDesc(entry.payments),
  })))
}

export function flattenVisibleTreeNodes(
  nodes: ContributionTreeNode[],
  expanded: ReadonlySet<string>,
): Array<
  | { kind: 'group'; node: ContributionTreeNode }
  | { kind: 'payment'; node: ContributionTreeNode; payment: ContributionStructureRow }
> {
  const rows: Array<
    | { kind: 'group'; node: ContributionTreeNode }
    | { kind: 'payment'; node: ContributionTreeNode; payment: ContributionStructureRow }
  > = []

  function walk(node: ContributionTreeNode) {
    rows.push({ kind: 'group', node })
    if (!expanded.has(node.id)) return

    for (const child of node.children) walk(child)

    for (const payment of node.payments) {
      rows.push({ kind: 'payment', node, payment })
    }
  }

  for (const root of nodes) walk(root)
  return rows
}

export function collectExpandableNodeIds(nodes: ContributionTreeNode[]): string[] {
  const ids: string[] = []
  function walk(node: ContributionTreeNode) {
    if (node.children.length > 0 || node.payments.length > 0) ids.push(node.id)
    for (const child of node.children) walk(child)
  }
  for (const root of nodes) walk(root)
  return ids
}
