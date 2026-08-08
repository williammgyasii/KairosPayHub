export type ChurchRole =
  | 'Pastor'
  | 'PFCCManager'
  | 'FellowshipLeader'
  | 'CellLeader'
  | 'Member'

export type Me =
  | { onboarded: false; email: string | null; name: string | null }
  | {
      onboarded: true
      id: string
      churchId: string | null
      churchName: string | null
      churchLogoUrl: string | null
      organizationId: string
      role: ChurchRole | 'Leader'
      scopeNodeId?: string | null
      scopeUnitName?: string | null
      legacyChurchId: string | null
      email: string | null
      name: string | null
    }

export function needsOnboarding(me: Me): boolean {
  return !me.onboarded
}

export function isPastor(role: string): boolean {
  return role === 'Pastor'
}

export function isScopedLeader(role: string): boolean {
  return role === 'PFCCManager' || role === 'FellowshipLeader'
}

export function displayName(me: Me, sessionEmail?: string | null): string {
  return me.name ?? me.email ?? sessionEmail ?? ''
}
