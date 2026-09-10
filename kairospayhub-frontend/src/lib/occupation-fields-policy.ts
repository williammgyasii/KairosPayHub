import type { MemberOccupationStatus } from '@/api/structure'

export type OccupationFieldsPolicy = {
  showSchool: boolean
  showWorkplace: boolean
  schoolLabel: string
  workplaceLabel: string
  persistedStatus: MemberOccupationStatus | null
}

export function occupationFieldsPolicy(
  status: MemberOccupationStatus | '' | null | undefined,
): OccupationFieldsPolicy {
  const persistedStatus = status || null
  return {
    showSchool: status === 'Student' || status === 'StudentAndWorking',
    showWorkplace: status === 'Working' || status === 'StudentAndWorking',
    schoolLabel: 'School / institution',
    workplaceLabel: 'Workplace',
    persistedStatus,
  }
}
