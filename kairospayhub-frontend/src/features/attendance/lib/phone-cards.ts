import type { AttendancePresentPerson } from '@/features/attendance/api'
import {
  approvalStatusLabel,
  personKindLabel,
} from '@/features/attendance/components/attendance-overview-parts'
import { phoneListCard } from '@/shared/lib/phone-list'

export function attendancePersonPhoneCard(
  row: AttendancePresentPerson,
  labels: { unit: string; parent: string },
) {
  return phoneListCard({
    title: row.name,
    lines: [row.cellName, personKindLabel(row.personKind)],
    details: [
      { label: 'Name', value: row.name },
      { label: labels.unit, value: row.cellName },
      { label: labels.parent, value: row.parentUnitName },
      { label: 'Type', value: personKindLabel(row.personKind) },
      { label: 'Phone', value: row.phone },
      { label: 'Invited by', value: row.invitedByMemberName },
    ],
  })
}

export function attendanceUnitPhoneCard(unit: {
  id: string
  scopeUnitName: string
  parentUnitName?: string | null
  totalPresent?: number | null
  membersPresent?: number | null
  firstTimersPresent?: number | null
  guestsPresent?: number | null
  approvalStatus?: string | null
  submittedAt?: string | null
}) {
  const present = unit.totalPresent ?? 0
  return phoneListCard({
    title: unit.scopeUnitName,
    lines: [`${present} present`, approvalStatusLabel(unit.approvalStatus ?? '')],
    details: [
      { label: 'Unit', value: unit.scopeUnitName },
      { label: 'Parent', value: unit.parentUnitName },
      { label: 'Present', value: String(present) },
      { label: 'Members', value: String(unit.membersPresent ?? 0) },
      { label: 'First-timers', value: String(unit.firstTimersPresent ?? 0) },
      { label: 'Guests', value: String(unit.guestsPresent ?? 0) },
      { label: 'Status', value: approvalStatusLabel(unit.approvalStatus ?? '') },
      {
        label: 'Submitted',
        value: unit.submittedAt
          ? new Date(unit.submittedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : null,
      },
    ],
  })
}
