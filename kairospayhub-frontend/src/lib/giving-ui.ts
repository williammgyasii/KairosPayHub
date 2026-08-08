import type {
  Contribution,
  GivingType,
  ProgramScopeKind,
  ProgramStatus,
  ContributionStatus,
  RemittanceMedium,
} from '@/api/giving'
import type { StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { getLayers, nodeById, nodePathBelowScopeRoot, parentChain } from '@/lib/structure-tree'

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

function givingDateOrdinal(day: number): string {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return `${day}TH`
  switch (day % 10) {
    case 1:
      return `${day}ST`
    case 2:
      return `${day}ND`
    case 3:
      return `${day}RD`
    default:
      return `${day}TH`
  }
}

/** e.g. AUGUST 8TH */
export function formatGivingDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const month = date.toLocaleString('en-US', { month: 'long' }).toUpperCase()
  return `${month} ${givingDateOrdinal(date.getDate())}`
}

/** e.g. AUGUST 8TH · 6:30 PM */
export function formatGivingDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${formatGivingDate(date)} · ${time}`
}

export function contributionLegacyParentLabel(contribution: {
  isLegacyParentContribution?: boolean | null
}) {
  return contribution.isLegacyParentContribution ? 'Before sub-givings' : null
}

export function contributionSubGivingLabel(contribution: {
  programTitle?: string | null
  programPeriodLabel?: string | null
  isSubGiving?: boolean | null
}) {
  if (!contribution.isSubGiving) return null
  const title = contribution.programTitle?.trim() || 'Sub-giving'
  const period = contribution.programPeriodLabel?.trim()
  return period ? `${title} · ${period}` : title
}

const CREATED_BY_ROLE_LABELS: Record<string, string> = {
  Pastor: 'Pastor',
  PFCCManager: 'PFCC Manager',
  FellowshipLeader: 'Fellowship Leader',
  CellLeader: 'Cell Leader',
}

export function createdByRoleLabel(value: string | null | undefined) {
  if (!value) return null
  return CREATED_BY_ROLE_LABELS[value] ?? value
}

export function programCreatorLabel(program: {
  createdByRole?: string | null
  createdByName?: string | null
  createdByScopeUnitName?: string | null
}) {
  if (!program.createdByRole || program.createdByRole === 'Pastor') {
    return program.createdByName?.trim() || 'Church'
  }

  const parts: string[] = []
  if (program.createdByName?.trim()) parts.push(program.createdByName.trim())
  const role = createdByRoleLabel(program.createdByRole)
  if (role) parts.push(role)
  if (program.createdByScopeUnitName?.trim()) parts.push(program.createdByScopeUnitName.trim())
  return parts.join(' · ') || 'Unknown leader'
}

export function contributionEntererLabel(contribution: {
  enteredByRole?: string | null
  enteredByName?: string | null
  enteredByScopeUnitName?: string | null
}) {
  if (!contribution.enteredByRole) return 'Unknown'

  if (contribution.enteredByRole === 'Pastor') {
    return contribution.enteredByName?.trim() || 'Pastor'
  }

  const parts: string[] = []
  if (contribution.enteredByName?.trim()) parts.push(contribution.enteredByName.trim())
  const role = createdByRoleLabel(contribution.enteredByRole)
  if (role) parts.push(role)
  if (contribution.enteredByScopeUnitName?.trim()) parts.push(contribution.enteredByScopeUnitName.trim())
  return parts.join(' · ') || createdByRoleLabel(contribution.enteredByRole) || 'Unknown'
}

export function contributionAttachmentUrl(contribution: {
  attachmentUrl?: string | null
  attachmentKey?: string | null
}) {
  return contribution.attachmentUrl?.trim() || null
}

export function contributionRemittanceSummary(contribution: {
  sentToPastor?: boolean | null
  remittanceMedium?: RemittanceMedium | string | null
  remittanceMediumOther?: string | null
}) {
  if (contribution.sentToPastor !== true) return null
  if (!contribution.remittanceMedium) return 'Sent to pastor'
  if (contribution.remittanceMedium === 'Other' && contribution.remittanceMediumOther?.trim()) {
    return contribution.remittanceMediumOther.trim()
  }
  return remittanceMediumLabel(contribution.remittanceMedium)
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

export function canApproveContribution(
  viewerRole: string,
  contribution: Pick<Contribution, 'status' | 'pendingApproverRole'>,
): boolean {
  if (contribution.status !== 'PendingApproval') return false
  return contribution.pendingApproverRole === viewerRole
}

export function contributionsAwaitingMyApproval(viewerRole: string, contributions: Contribution[]) {
  return contributions.filter((c) => canApproveContribution(viewerRole, c))
}

export function contributionStatusLabel(
  status: ContributionStatus | string,
  viewerRole: string,
  pendingApproverRole?: string | null,
) {
  if (status === 'PendingApproval') {
    return canApproveContribution(viewerRole, {
      status,
      pendingApproverRole: pendingApproverRole ?? null,
    })
      ? 'Pending approval'
      : 'Awaiting approval'
  }
  if (status === 'Approved') return 'Approved'
  if (status === 'Rejected') return 'Rejected'
  return status
}

export function remittanceMediumLabel(value: RemittanceMedium | string | null | undefined) {
  switch (value) {
    case 'PastorBank':
      return 'Pastor bank'
    case 'ChurchMomo':
      return 'Church MoMo'
    case 'PastorMomo':
      return 'Pastor MoMo'
    case 'Other':
      return 'Other'
    default:
      return value ?? '—'
  }
}

export const REMITTANCE_MEDIUM_OPTIONS: { value: RemittanceMedium; label: string }[] = [
  { value: 'PastorBank', label: 'Pastor bank' },
  { value: 'ChurchMomo', label: 'Church MoMo' },
  { value: 'PastorMomo', label: 'Pastor MoMo' },
  { value: 'Other', label: 'Other' },
]

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

export function nodePathLabel(
  tree: StructureTree,
  nodeId: string,
  scopeRootNodeId?: string | null,
) {
  if (scopeRootNodeId) {
    return nodePathBelowScopeRoot(tree, nodeId, scopeRootNodeId)
  }

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
