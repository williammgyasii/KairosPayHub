import { describe, expect, it } from 'vitest'
import { shouldShowIosInstallHint } from './ios-install-hint'

describe('shouldShowIosInstallHint', () => {
  it('shows on iOS Safari when not standalone', () => {
    expect(
      shouldShowIosInstallHint({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        standalone: false,
      }),
    ).toBe(true)
  })

  it('hides in standalone and on Android Chrome', () => {
    expect(
      shouldShowIosInstallHint({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        standalone: true,
      }),
    ).toBe(false)
    expect(
      shouldShowIosInstallHint({
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        standalone: false,
      }),
    ).toBe(false)
  })
})
