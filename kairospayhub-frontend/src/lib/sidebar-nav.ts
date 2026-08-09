export type SidebarNavMatch =
  | 'exact'
  | 'prefix'
  | 'roster-units'
  | 'roster-membership'
  | 'givings-campaigns'
  | 'givings-transactions'
  | 'givings-overall'
  | 'givings-section'

export function normalizeSidebarPath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

export function sidebarNavTarget(to: string) {
  if (to === '.' || to === '') return '/'
  return `/${to.replace(/^\//, '')}`
}

export function matchesSidebarNavPath(
  pathname: string,
  to: string,
  match: SidebarNavMatch = 'exact',
) {
  const current = normalizeSidebarPath(pathname)
  const target = sidebarNavTarget(to)

  switch (match) {
    case 'exact':
      return current === target
    case 'prefix':
      return current === target || current.startsWith(`${target}/`)
    case 'roster-units':
      return current === '/roster' || current.startsWith('/roster/units/')
    case 'roster-membership':
      return current === '/roster/membership' || current === '/membership'
    case 'givings-campaigns':
      if (current === '/givings') return true
      if (!current.startsWith('/givings/')) return false
      if (current === '/givings/transactions' || current.startsWith('/givings/transactions/')) {
        return false
      }
      if (current === '/givings/overall' || current.startsWith('/givings/overall/')) {
        return false
      }
      return true
    case 'givings-transactions':
      return current === '/givings/transactions'
    case 'givings-overall':
      return current === '/givings/overall'
    case 'givings-section':
      return (
        current === '/givings' ||
        current.startsWith('/givings/') ||
        current.startsWith('/programs/')
      )
  }
}

export function sidebarNavMatchFor(to: string, end?: boolean): SidebarNavMatch {
  if (to === 'roster') return 'roster-units'
  if (to === 'roster/membership') return 'roster-membership'
  if (to === 'givings') return 'givings-campaigns'
  if (to === 'givings/transactions') return 'givings-transactions'
  if (to === 'givings/overall') return 'givings-overall'
  return end ? 'exact' : 'prefix'
}

export function isSidebarNavItemActive(
  pathname: string,
  item: { to: string; end?: boolean; match?: SidebarNavMatch },
) {
  const match = item.match ?? sidebarNavMatchFor(item.to, item.end)
  return matchesSidebarNavPath(pathname, item.to, match)
}
