import type { ChurchAdminAffiliationKind } from '@/api/administrators'

export const CHURCH_ADMIN_AFFILIATION = {
  External: 'External',
  InChurch: 'InChurch',
} as const satisfies Record<ChurchAdminAffiliationKind, ChurchAdminAffiliationKind>

export function churchAdminAffiliationLabel(
  kind: ChurchAdminAffiliationKind,
  memberName?: string | null,
): string {
  if (kind === CHURCH_ADMIN_AFFILIATION.InChurch) {
    return memberName?.trim() || 'In church'
  }
  return 'External'
}

export function churchAdminStatusLabel(isActive: boolean): string {
  return isActive ? 'Active' : 'Disabled'
}

export function isActiveChurchAdministrator(admin: { isActive: boolean }): boolean {
  return admin.isActive
}
