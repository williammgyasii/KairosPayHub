import { Can, useAbility } from '@casl/react'
import type { AppAbility } from '@/lib/abilities'

export { Can }

export function useAppAbility() {
  return useAbility<AppAbility>()
}
