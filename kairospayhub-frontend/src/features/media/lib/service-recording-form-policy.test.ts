import {
  serviceRecordingTitleExists,
  validateServiceRecordingDescription,
  validateServiceRecordingTitle,
} from '@/features/media/lib/service-recording-form-policy'

describe('service-recording-form-policy', () => {
  it('detects duplicate titles case-insensitively', () => {
    expect(
      serviceRecordingTitleExists('Sunday Service', ['Sunday Service', 'Week 2']),
    ).toBe(true)
    expect(
      serviceRecordingTitleExists('sunday service', ['Sunday Service']),
    ).toBe(true)
  })

  it('ignores excluded title when editing', () => {
    expect(
      serviceRecordingTitleExists('Sunday Service', ['Sunday Service'], 'Sunday Service'),
    ).toBe(false)
  })

  it('validates required title and duplicates', () => {
    expect(
      validateServiceRecordingTitle('', { existingTitles: [] }),
    ).toBe('Title is required.')
    expect(
      validateServiceRecordingTitle('Sunday Service', {
        existingTitles: ['Sunday Service'],
      }),
    ).toBe('A recording with this title already exists.')
    expect(
      validateServiceRecordingTitle('Week 2', { existingTitles: ['Sunday Service'] }),
    ).toBeNull()
  })

  it('validates description length', () => {
    expect(validateServiceRecordingDescription('')).toBeNull()
    expect(
      validateServiceRecordingDescription('x'.repeat(2001)),
    ).toMatch(/2000 characters/)
  })
})
