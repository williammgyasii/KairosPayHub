import { describe, expect, it } from 'vitest'
import {
  destinationFromPushPayload,
  osNotificationChrome,
  parsePushEventData,
} from './push-destination'

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

describe('osNotificationChrome', () => {
  it('uses the PWA product icon for the OS banner and status badge', () => {
    expect(osNotificationChrome('https://dev.app.kairospayhub.com')).toEqual({
      icon: 'https://dev.app.kairospayhub.com/icons/icon-192.png',
      badge: 'https://dev.app.kairospayhub.com/icons/icon-192.png',
    })
  })
})
