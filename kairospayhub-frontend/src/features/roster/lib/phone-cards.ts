import type { MembershipLayerRef } from '@/features/roster/lib/membership-table-columns'
import { phoneListCard } from '@/shared/lib/phone-list'
import type { StructureMemberRow, StructureUnitNodeRow } from '@/lib/structure-table-rows'

export function membershipPhoneCard(
  row: StructureMemberRow,
  layers: MembershipLayerRef[],
  options: { includePhoneLine?: boolean } = {},
) {
  const deepest = row.structure.at(-1)
  const unitRole = [deepest?.nodeName, row.role].filter(Boolean).join(' · ')
  return phoneListCard({
    title: row.member,
    lines: options.includePhoneLine === false ? [unitRole] : [unitRole, row.phone],
    details: [
      { label: 'Email', value: row.email },
      { label: 'Phone', value: row.phone },
      { label: 'Role', value: row.role },
      { label: 'Age', value: row.age },
      { label: 'Date of birth', value: row.dateOfBirth },
      { label: 'Residence', value: row.residence },
      { label: 'State', value: row.state },
      { label: 'Occupation', value: row.occupationStatus },
      { label: 'School', value: row.schoolOrWorkplace },
      { label: 'Workplace', value: row.workplace },
      ...layers.map((layer) => ({
        label: layer.displayName,
        value: row.structure.find((segment) => segment.layerId === layer.id)?.nodeName,
      })),
    ],
  })
}

export function unitsPhoneCard(row: StructureUnitNodeRow, childLayerName?: string) {
  return phoneListCard({
    title: row.name,
    lines: [row.parentSegment?.nodeName, `${row.memberCount} members`],
    details: [
      { label: 'Name', value: row.name },
      { label: 'Parent', value: row.parentSegment?.nodeName },
      { label: 'Leader', value: row.leaderName },
      { label: 'Members', value: String(row.memberCount) },
      { label: childLayerName ?? 'Child units', value: String(row.childUnitCount) },
    ],
  })
}
