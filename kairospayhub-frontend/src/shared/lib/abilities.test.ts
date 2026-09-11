import { describe, expect, it } from 'vitest'
import {
  createAbilityFromAbilityIds,
  createAbilityFromRules,
  createAppAbility,
  hasProductAbility,
  PRODUCT_ABILITIES,
} from '@/shared/lib/abilities'

describe('createAbilityFromRules', () => {
  it('allows view MemberGivings from packed rules', () => {
    const ability = createAbilityFromRules([{ action: 'view', subject: 'MemberGivings' }])
    expect(ability.can('view', 'MemberGivings')).toBe(true)
    expect(ability.can('manage', 'Church')).toBe(false)
  })
})

describe('createAppAbility', () => {
  it('prefers packed rules over ability ids', () => {
    const ability = createAppAbility({
      abilityRules: [{ action: 'view', subject: 'MemberGivings' }],
      abilities: [PRODUCT_ABILITIES.manageChurch],
    })
    expect(ability.can('view', 'MemberGivings')).toBe(true)
    expect(ability.can('manage', 'Church')).toBe(false)
  })

  it('falls back to ability ids', () => {
    const ability = createAppAbility({
      abilities: [PRODUCT_ABILITIES.viewMemberGivings, PRODUCT_ABILITIES.approveGiving],
    })
    expect(ability.can('view', 'MemberGivings')).toBe(true)
    expect(ability.can('approve', 'Giving')).toBe(true)
  })
})

describe('hasProductAbility', () => {
  it('checks the abilities list from /me', () => {
    expect(hasProductAbility([PRODUCT_ABILITIES.viewMemberGivings], PRODUCT_ABILITIES.viewMemberGivings)).toBe(
      true,
    )
    expect(hasProductAbility([], PRODUCT_ABILITIES.viewMemberGivings)).toBe(false)
  })

  it('recognizes createChildUnits without a role name', () => {
    expect(hasProductAbility([PRODUCT_ABILITIES.createChildUnits], PRODUCT_ABILITIES.createChildUnits)).toBe(
      true,
    )
    const ability = createAbilityFromAbilityIds([PRODUCT_ABILITIES.createChildUnits])
    expect(ability.can('create', 'ChildUnit')).toBe(true)
  })
})
