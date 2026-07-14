export type Role = 'Pastor' | 'Leader'

export type Me =
  | { onboarded: false; email: string | null; name: string | null }
  | {
      onboarded: true
      id: string
      organizationId: string
      role: Role
      churchId: string | null
      email: string | null
      name: string | null
    }

export function needsOnboarding(me: Me): boolean {
  return !me.onboarded
}

export function displayName(me: Me, sessionEmail?: string | null): string {
  return me.name ?? me.email ?? sessionEmail ?? ''
}
