export type ChurchRole =
  | 'Pastor'
  | 'ChurchAdmin'
  | 'PFCCManager'
  | 'FellowshipLeader'
  | 'CellLeader'
  | 'Member'

export type RollCallScope = {
  scopeNodeId: string
  scopeUnitName: string
}

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
      rollCallScopes?: RollCallScope[]
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

export function canManageChurch(role: string): boolean {
  return role === 'Pastor' || role === 'ChurchAdmin'
}

export function isScopedLeader(role: string): boolean {
  return role === 'PFCCManager' || role === 'FellowshipLeader'
}

export function canCreateSubGiving(role: string): boolean {
  return canCreateGivingProgram(role)
}

export function canCreateGivingProgram(role: string): boolean {
  return canManageChurch(role) || role === 'PFCCManager'
}

export function canManageMembers(role: string): boolean {
  return canManageChurch(role) || isScopedLeader(role)
}

export function isCellLeader(role: string): boolean {
  return role === 'CellLeader'
}

export function rollCallScopesFor(me: Me): RollCallScope[] {
  if (!me.onboarded) return []
  return me.rollCallScopes ?? []
}

export function canSubmitRollCall(me: Me): boolean {
  return rollCallScopesFor(me).length > 0
}

export function canApproveAttendance(role: string): boolean {
  return canManageChurch(role) || isScopedLeader(role)
}

export function displayName(me: Me, sessionEmail?: string | null): string {
  return me.name ?? me.email ?? sessionEmail ?? ''
}
