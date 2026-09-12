export function shouldShowIosInstallHint({
  userAgent,
  standalone,
}: {
  userAgent: string
  standalone: boolean
}): boolean {
  if (standalone) return false
  const ios = /iPad|iPhone|iPod/.test(userAgent)
  if (!ios) return false
  const chromeIos = /CriOS|FxiOS|EdgiOS/.test(userAgent)
  return !chromeIos
}
