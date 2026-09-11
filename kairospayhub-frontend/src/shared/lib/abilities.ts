import { AbilityBuilder, createMongoAbility, type MongoAbility, type RawRuleOf } from '@casl/ability'

export type AppActions =
  | 'manage'
  | 'view'
  | 'approve'
  | 'log'
  | 'create'

export type AppSubjects =
  | 'Church'
  | 'Structure'
  | 'MemberGivings'
  | 'Giving'
  | 'Campaign'
  | 'SubCampaign'
  | 'OverallGivings'
  | 'Roster'
  | 'ChildUnit'
  | 'all'

export type AppAbility = MongoAbility<[AppActions, AppSubjects]>

export type AbilityRule = {
  action: string
  subject: string
}

export const PRODUCT_ABILITIES = {
  manageChurch: 'manageChurch',
  manageStructure: 'manageStructure',
  viewMemberGivings: 'viewMemberGivings',
  approveGiving: 'approveGiving',
  logGiving: 'logGiving',
  createCampaign: 'createCampaign',
  createSubCampaign: 'createSubCampaign',
  viewOverallGivings: 'viewOverallGivings',
  manageRoster: 'manageRoster',
  createChildUnits: 'createChildUnits',
} as const

export type ProductAbility = (typeof PRODUCT_ABILITIES)[keyof typeof PRODUCT_ABILITIES]

/** Build a CASL ability from API-packed rules (source of truth). */
export function createAbilityFromRules(rules: AbilityRule[] | null | undefined): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)
  for (const rule of rules ?? []) {
    can(rule.action as AppActions, rule.subject as AppSubjects)
  }
  return build()
}

/** Fallback when older `/me` payloads lack abilityRules — derive from ability string list. */
export function createAbilityFromAbilityIds(abilities: string[] | null | undefined): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)
  for (const ability of abilities ?? []) {
    switch (ability) {
      case PRODUCT_ABILITIES.manageChurch:
        can('manage', 'Church')
        break
      case PRODUCT_ABILITIES.manageStructure:
        can('manage', 'Structure')
        break
      case PRODUCT_ABILITIES.viewMemberGivings:
        can('view', 'MemberGivings')
        break
      case PRODUCT_ABILITIES.approveGiving:
        can('approve', 'Giving')
        break
      case PRODUCT_ABILITIES.logGiving:
        can('log', 'Giving')
        break
      case PRODUCT_ABILITIES.createCampaign:
        can('create', 'Campaign')
        break
      case PRODUCT_ABILITIES.createSubCampaign:
        can('create', 'SubCampaign')
        break
      case PRODUCT_ABILITIES.viewOverallGivings:
        can('view', 'OverallGivings')
        break
      case PRODUCT_ABILITIES.manageRoster:
        can('manage', 'Roster')
        break
      case PRODUCT_ABILITIES.createChildUnits:
        can('create', 'ChildUnit')
        break
      default:
        break
    }
  }
  return build()
}

export function createAppAbility(input: {
  abilityRules?: AbilityRule[] | null
  abilities?: string[] | null
}): AppAbility {
  if (input.abilityRules && input.abilityRules.length > 0) {
    return createAbilityFromRules(input.abilityRules)
  }
  return createAbilityFromAbilityIds(input.abilities)
}

export function hasProductAbility(
  abilities: string[] | null | undefined,
  ability: ProductAbility,
): boolean {
  return (abilities ?? []).includes(ability)
}

export type PackedRule = RawRuleOf<AppAbility>
