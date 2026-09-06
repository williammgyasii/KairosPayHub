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
  layerName?: string | null
}

export type AbilityRuleDto = {
  action: string
  subject: string
}

export type MeNotOnboarded = {
  onboarded: false
  email: string | null
  name: string | null
  churchId?: string | null
  churchName?: string | null
  location?: string | null
  pastorName?: string | null
  memberCount?: number | null
  countryCode?: string | null
  defaultCurrency?: string | null
  timeZoneId?: string | null
  onboardingStep?: 'structure' | null
  role?: string | null
  abilities?: string[]
  abilityRules?: AbilityRuleDto[]
  leadershipProfile?: string | null
}

export type Me =
  | MeNotOnboarded
  | {
      onboarded: true
      id: string
      churchId: string | null
      churchName: string | null
      churchLogoUrl: string | null
      countryCode?: string | null
      defaultCurrency?: string | null
      timeZoneId?: string | null
      organizationId: string
      role: ChurchRole | 'Leader'
      scopeNodeId?: string | null
      scopeUnitName?: string | null
      rollCallScopes?: RollCallScope[]
      legacyChurchId: string | null
      email: string | null
      name: string | null
      /** Product abilities from API (preferred for feature gates). */
      abilities?: string[]
      /** Packed CASL rules from API. */
      abilityRules?: AbilityRuleDto[]
      leadershipProfile?: string | null
    }

export function needsOnboarding(me: Me): boolean {
  return !me.onboarded
}

export function isNotOnboarded(me: Me): me is MeNotOnboarded {
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

/** Prefer API abilities; fall back to role helpers for older payloads. */
export function canViewMemberGivings(roleOrMe: string | Me): boolean {
  if (typeof roleOrMe !== 'string') {
    if (roleOrMe.onboarded && hasAbilityList(roleOrMe.abilities, 'viewMemberGivings')) return true
    if (!roleOrMe.onboarded) return false
    return canViewMemberGivings(roleOrMe.role)
  }
  return canManageChurch(roleOrMe) || isScopedLeader(roleOrMe) || isCellLeader(roleOrMe)
}

function hasAbilityList(abilities: string[] | undefined, ability: string) {
  return (abilities ?? []).includes(ability)
}

export function canApproveGiving(roleOrMe: string | Me): boolean {
  if (typeof roleOrMe !== 'string') {
    if (roleOrMe.onboarded && hasAbilityList(roleOrMe.abilities, 'approveGiving')) return true
    if (!roleOrMe.onboarded) return false
    return canApproveGiving(roleOrMe.role)
  }
  return canManageChurch(roleOrMe) || isScopedLeader(roleOrMe)
}

export function canViewOverallGivings(roleOrMe: string | Me): boolean {
  if (typeof roleOrMe !== 'string') {
    if (roleOrMe.onboarded && hasAbilityList(roleOrMe.abilities, 'viewOverallGivings')) return true
    if (!roleOrMe.onboarded) return false
    return canViewOverallGivings(roleOrMe.role)
  }
  return canManageChurch(roleOrMe) || isScopedLeader(roleOrMe) || isCellLeader(roleOrMe)
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
  // One-hop parent leaders only — pastors/admins use Metrics, not the attendance approval queue.
  return isScopedLeader(role)
}

export function canViewAttendanceMetrics(role: string): boolean {
  return canManageChurch(role) || isScopedLeader(role)
}

export function displayName(me: Me, sessionEmail?: string | null): string {
  return me.name ?? me.email ?? sessionEmail ?? ''
}

export function churchCurrency(me: Me | null | undefined): string {
  return me?.defaultCurrency ?? 'GHS'
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
