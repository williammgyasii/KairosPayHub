import { describe, expect, it } from 'vitest'
import { websiteLink } from './website-link'

describe('websiteLink', () => {
  it('links an https site and labels it by host', () => {
    expect(websiteLink('https://www.madisonchristian.org/')).toEqual({
      href: 'https://www.madisonchristian.org/',
      label: 'madisonchristian.org',
    })
  })

  it('adds https to a bare domain', () => {
    expect(websiteLink('gracechapel.com')).toEqual({ href: 'https://gracechapel.com/', label: 'gracechapel.com' })
  })

  it('refuses anything that is not a web address', () => {
    expect(websiteLink('javascript:alert(1)')).toBeNull()
    expect(websiteLink('')).toBeNull()
    expect(websiteLink(null)).toBeNull()
  })
})
