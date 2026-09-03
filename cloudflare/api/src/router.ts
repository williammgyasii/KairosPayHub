/** Paths handled by the .NET API container (not the Pages SPA). */
export function isApiRequest(pathname: string): boolean {
  return (
    pathname === '/health' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/hubs')
  )
}

export async function proxyToPages(
  request: Request,
  pagesOrigin: string,
): Promise<Response> {
  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, pagesOrigin)

  const headers = new Headers(request.headers)
  headers.set('Host', new URL(pagesOrigin).host)

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
  }

  return fetch(new Request(target.toString(), init))
}
