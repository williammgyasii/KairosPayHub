import { describe, expect, it } from 'vitest'
import {
  CHURCH_ADMIN_AFFILIATION,
  churchAdminAffiliationLabel,
  churchAdminStatusLabel,
  isActiveChurchAdministrator,
} from '@/features/settings/lib/church-administrators'

describe('church-administrators helpers', () => {
  it('labels affiliation without magic branches at call sites', () => {
    expect(churchAdminAffiliationLabel(CHURCH_ADMIN_AFFILIATION.External)).toBe('External')
    expect(churchAdminAffiliationLabel(CHURCH_ADMIN_AFFILIATION.InChurch)).toBe('In church')
    expect(churchAdminAffiliationLabel(CHURCH_ADMIN_AFFILIATION.InChurch, 'Ada')).toBe('Ada')
  })

  it('labels status as Active or Disabled', () => {
    expect(churchAdminStatusLabel(true)).toBe('Active')
    expect(churchAdminStatusLabel(false)).toBe('Disabled')
    expect(isActiveChurchAdministrator({ isActive: true })).toBe(true)
    expect(isActiveChurchAdministrator({ isActive: false })).toBe(false)
  })
})
