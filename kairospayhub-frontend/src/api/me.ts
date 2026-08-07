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
      legacyChurchId: string | null
      email: string | null
      name: string | null
    }

export function needsOnboarding(me: Me): boolean {
  return !me.onboarded
}

export function displayName(me: Me, sessionEmail?: string | null): string {
  return me.name ?? me.email ?? sessionEmail ?? ''
}
