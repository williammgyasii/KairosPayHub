import { describe, expect, it } from 'vitest'
import { destinationFromPushPayload, parsePushEventData } from './push-destination'

describe('parsePushEventData', () => {
  it('still shows a banner when the payload is empty or invalid', () => {
    expect(parsePushEventData(null).title).toBe('KairosPayHub')
    expect(parsePushEventData('not-json').title).toBe('KairosPayHub')
  })
})

describe('destinationFromPushPayload', () => {
  it('opens the link path when present', () => {
    expect(destinationFromPushPayload({ linkPath: 'givings/abc' })).toBe('/givings/abc')
    expect(destinationFromPushPayload({ linkPath: '/attendance/submissions' })).toBe(
      '/attendance/submissions',
    )
  })

  it('opens home when there is no path', () => {
    expect(destinationFromPushPayload(null)).toBe('/')
    expect(destinationFromPushPayload({})).toBe('/')
    expect(destinationFromPushPayload({ linkPath: '  ' })).toBe('/')
  })
})
