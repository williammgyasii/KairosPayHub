import { useMemo, type ReactNode } from 'react'
import { AbilityProvider as CaslAbilityProvider } from '@casl/react'
import type { Me } from '@/api/auth'
import { createAppAbility } from '@/lib/abilities'

export function AbilityProvider({
  me,
  children,
}: {
  me: Me & { onboarded: true }
  children: ReactNode
}) {
  const ability = useMemo(
    () =>
      createAppAbility({
        abilityRules: me.abilityRules,
        abilities: me.abilities,
      }),
    [me.abilityRules, me.abilities],
  )

  return <CaslAbilityProvider value={ability}>{children}</CaslAbilityProvider>
}
