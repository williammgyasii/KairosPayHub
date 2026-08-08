import type { GivingType, ProgramScopeKind, ProgramStatus, ContributionStatus } from '@/api/giving'
import type { StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { getLayers, nodeById, parentChain } from '@/lib/structure-tree'

export const GIVING_TYPE_OPTIONS: { value: GivingType; label: string; description: string }[] = [
  { value: 'Rhapsody', label: 'Rhapsody', description: 'Church-wide Rhapsody of Realities giving' },
  { value: 'SundayService', label: 'Sunday service', description: 'Regular Sunday offerings' },
  { value: 'SpecialProgram', label: 'Special program', description: 'One-off campaigns and events' },
  { value: 'FellowshipGiving', label: 'Fellowship giving', description: 'Fellowship-level collections' },
]

export const SCOPE_KIND_LABELS: Record<ProgramScopeKind | string, string> = {
  ChurchWide: 'Church-wide',
  Fellowship: 'Fellowship',
  PFCC: 'PFCC',
  FellowshipGroup: 'Fellowship group',
}

export function givingTypeLabel(value: string) {
  return GIVING_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function scopeKindLabel(value: string) {
  return SCOPE_KIND_LABELS[value] ?? value
}

export function programStatusLabel(status: ProgramStatus | string) {
  return status === 'Open' ? 'Open' : 'Closed'
}

export function contributionStatusTone(status: ContributionStatus | string) {
  switch (status) {
    case 'Approved':
      return 'success' as const
    case 'Rejected':
      return 'destructive' as const
    default:
      return 'pending' as const
  }
}

export function nodesForScopeKind(
  tree: StructureTree,
  scopeKind: ProgramScopeKind | string,
): StructureNode[] {
  const layerTypeForScope = (): StructureLayerType | null => {
    switch (scopeKind) {
      case 'Fellowship':
      case 'FellowshipGroup':
        return 'Fellowship'
      case 'PFCC':
        return 'PFCC'
      default:
        return null
    }
  }

  const layerType = layerTypeForScope()
  if (!layerType) return []

  const layer = getLayers(tree).find((l) => l.standardType === layerType)
  if (!layer) return []

  return tree.nodes
    .filter((n) => n.layerId === layer.id)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function nodePathLabel(tree: StructureTree, nodeId: string) {
  return parentChain(tree, nodeId)
    .map((n) => n.name)
    .join(' → ')
}

export function defaultPeriodLabel() {
  return String(new Date().getFullYear())
}

export function defaultProgramTitle(givingType: GivingType | string) {
  if (givingType === 'Rhapsody') return `Rhapsody ${defaultPeriodLabel()}`
  return `${givingTypeLabel(givingType)} ${defaultPeriodLabel()}`
}

export function nodeByIdSafe(tree: StructureTree, nodeId: string | null | undefined) {
  if (!nodeId) return undefined
  return nodeById(tree, nodeId)
}
