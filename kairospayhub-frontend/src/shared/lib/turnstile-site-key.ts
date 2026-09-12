/** Cloudflare Turnstile site key. Empty = widget hidden (local dev without Turnstile). */
export function turnstileSiteKey(): string {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? ''
}

export function isTurnstileEnabled(): boolean {
  return turnstileSiteKey().length > 0
}
