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

/** Scope root for roster layer tabs (PFCC/fellowship leaders and cell leaders). */
export function rosterScopeRootNodeId(me: Me): string | null {
  if (!me.onboarded) return null
  if (canManageChurch(me.role)) return null
  if (isCellLeader(me.role)) {
    return rollCallScopesFor(me)[0]?.scopeNodeId ?? me.scopeNodeId ?? null
  }
  if (isScopedLeader(me.role)) {
    return me.scopeNodeId ?? null
  }
  return null
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

const ROLE_BADGE_LABELS: Record<string, string> = {
  Pastor: 'Pastor',
  ChurchAdmin: 'Church admin',
  PFCCManager: 'PFCC manager',
  FellowshipLeader: 'Fellowship leader',
  CellLeader: 'Cell leader',
  Member: 'Member',
  Leader: 'Leader',
}

/** Top-bar badge: scoped leaders show their unit name + "leader" (e.g. "Zion Cell 1 leader"). */
export function roleScopeBadgeLabel(me: Me): string {
  if (!me.onboarded) return ''

  if (isCellLeader(me.role)) {
    const unit = rollCallScopesFor(me)[0]?.scopeUnitName ?? me.scopeUnitName
    if (unit) return `${unit} leader`
  }

  if (isScopedLeader(me.role) && me.scopeUnitName) {
    return `${me.scopeUnitName} leader`
  }

  return ROLE_BADGE_LABELS[me.role] ?? me.role
}
