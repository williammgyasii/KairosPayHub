export function websiteLink(website: string | null | undefined): { href: string; label: string } | null {
  const raw = website?.trim()
  if (!raw) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return { href: url.href, label: url.hostname.replace(/^www\./, '') }
  } catch {
    return null
  }
}
