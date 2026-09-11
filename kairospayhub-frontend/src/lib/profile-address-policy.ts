import {
  churchRegionLabel,
  churchRegionOptions,
  type ChurchRegionOption,
} from '@/lib/church-region-options'

export type ProfileAddressStateOption = ChurchRegionOption

export type ProfileAddressPolicy = {
  showState: boolean
  requireState: boolean
  residenceLabel: string
  residencePlaceholder: string
  stateLabel: string
  stateSelectPlaceholder: string
  stateOptions: ProfileAddressStateOption[]
}

const HOME_ADDRESS = {
  residenceLabel: 'Home address',
  residencePlaceholder: 'Street, city, or apartment',
} as const

export function profileAddressPolicy(countryCode?: string | null): ProfileAddressPolicy {
  const stateOptions = churchRegionOptions(countryCode)
  if (stateOptions.length === 0) {
    return {
      showState: false,
      requireState: false,
      stateLabel: 'State / region',
      stateSelectPlaceholder: '',
      stateOptions: [],
      ...HOME_ADDRESS,
    }
  }

  return {
    showState: true,
    requireState: true,
    stateLabel: churchRegionLabel(countryCode),
    stateSelectPlaceholder: `Select ${churchRegionLabel(countryCode).toLowerCase()}…`,
    stateOptions,
    ...HOME_ADDRESS,
  }
}
