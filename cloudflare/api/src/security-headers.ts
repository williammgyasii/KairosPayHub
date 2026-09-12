const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://challenges.cloudflare.com wss: https:",
  "frame-src https://challenges.cloudflare.com",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
