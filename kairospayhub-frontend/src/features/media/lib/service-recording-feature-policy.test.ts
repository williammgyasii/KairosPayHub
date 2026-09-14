import {
  isServiceRecordingsEnabled,
  parseAllowlist,
  serviceRecordingsVisible,
} from '@/features/media/lib/service-recording-feature-policy'

describe('service-recording-feature-policy', () => {
  it('parseAllowlist splits comma-separated ids', () => {
    expect(parseAllowlist('a, b ,')).toEqual(['a', 'b'])
  })

  it('isServiceRecordingsEnabled respects platform flag', () => {
    expect(
      isServiceRecordingsEnabled({ enabled: true, allowedChurchIds: [] }, 'church-1'),
    ).toBe(true)
  })

  it('isServiceRecordingsEnabled uses allowlist when platform off', () => {
    expect(
      isServiceRecordingsEnabled(
        { enabled: false, allowedChurchIds: ['pilot'] },
        'pilot',
      ),
    ).toBe(true)
    expect(
      isServiceRecordingsEnabled(
        { enabled: false, allowedChurchIds: ['pilot'] },
        'other',
      ),
    ).toBe(false)
  })

  it('serviceRecordingsVisible uses me.features from API', () => {
    expect(
      serviceRecordingsVisible({
        onboarded: true,
        churchId: 'x',
        features: { serviceRecordings: true },
      }),
    ).toBe(true)
    expect(
      serviceRecordingsVisible({
        onboarded: true,
        churchId: 'x',
        features: { serviceRecordings: false },
      }),
    ).toBe(false)
    expect(serviceRecordingsVisible({ onboarded: false })).toBe(false)
  })
})
