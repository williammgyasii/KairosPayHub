type NavPathRule =
  | { kind: 'exact'; paths: string[] }
  | { kind: 'prefix'; root: string; extra?: string[] }
  | { kind: 'section-home'; root: string; siblings: string[] }

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function sidebarPath(to: string) {
  if (to === '.' || to === '') return '/'
  return `/${to.replace(/^\//, '')}`
}

function isUnder(path: string, root: string) {
  return path === root || path.startsWith(`${root}/`)
}

function matchesRule(current: string, rule: NavPathRule): boolean {
  switch (rule.kind) {
    case 'exact':
      return rule.paths.includes(current)
    case 'prefix':
      return (rule.extra?.includes(current) ?? false) || isUnder(current, rule.root)
    case 'section-home':
      if (current === rule.root) return true
      if (!isUnder(current, rule.root)) return false
      return !rule.siblings.some((sibling) => isUnder(current, sibling))
  }
}

/** Declarative active-state rules keyed by sidebar `to` paths. */
const NAV_PATH_RULES: Record<string, NavPathRule> = {
  roster: { kind: 'section-home', root: '/roster', siblings: ['/roster/membership'] },
  'roster/membership': { kind: 'exact', paths: ['/roster/membership', '/membership'] },
  givings: {
    kind: 'section-home',
    root: '/givings',
    siblings: ['/givings/transactions', '/givings/overall'],
  },
  'givings/transactions': { kind: 'exact', paths: ['/givings/transactions'] },
  'givings/overall': { kind: 'exact', paths: ['/givings/overall'] },
  attendance: {
    kind: 'section-home',
    root: '/attendance',
    siblings: [
      '/attendance/submissions',
      '/attendance/approvals',
      '/attendance/overview',
      '/attendance/overall',
    ],
  },
  'attendance/submissions': { kind: 'exact', paths: ['/attendance/submissions'] },
  'attendance/approvals': { kind: 'exact', paths: ['/attendance/approvals'] },
  'attendance/overview': { kind: 'exact', paths: ['/attendance/overview', '/attendance/overall'] },
  events: { kind: 'exact', paths: ['/events'] },
  settings: { kind: 'prefix', root: '/settings' },
}

function defaultRule(to: string, end?: boolean): NavPathRule {
  const root = sidebarPath(to)
  return end ? { kind: 'exact', paths: [root] } : { kind: 'prefix', root }
}

export function isSidebarNavItemActive(
  pathname: string,
  item: { to: string; end?: boolean },
) {
  const current = normalizePath(pathname)
  const rule = NAV_PATH_RULES[item.to] ?? defaultRule(item.to, item.end)
  return matchesRule(current, rule)
}
