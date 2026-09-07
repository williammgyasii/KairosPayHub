import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export type ViewportName = 'mobile' | 'tablet' | 'desktop'

export const VIEWPORTS: Record<ViewportName, { width: number; height: number }> = {
  mobile: { width: 400, height: 775 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
}

type OverflowMetrics = {
  documentOverflow: boolean
  scrollWidth: number
  clientWidth: number
  /** Non-scrollport elements that paint past the viewport (clipped/broken layout). */
  spilled: { tag: string; className: string; right: number; left: number }[]
}

export async function measureHorizontalOverflow(page: Page): Promise<OverflowMetrics> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth)
    const clientWidth = doc.clientWidth
    const documentOverflow = scrollWidth > clientWidth + 1

    const scrollableAncestor = (el: Element | null): boolean => {
      let cur: Element | null = el
      while (cur && cur !== document.documentElement) {
        const style = getComputedStyle(cur)
        const ox = style.overflowX
        if (ox === 'auto' || ox === 'scroll') return true
        cur = cur.parentElement
      }
      return false
    }

    const spilled: OverflowMetrics['spilled'] = []
    const nodes = document.querySelectorAll('main *, header.sticky, main')
    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue
      if (el.classList.contains('sr-only')) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      // Allow intentional horizontal scroll regions (tables/tabs)
      if (scrollableAncestor(el)) continue
      if (r.right > clientWidth + 2 || r.left < -2) {
        spilled.push({
          tag: el.tagName,
          className: [...el.classList].slice(0, 5).join(' '),
          right: Math.round(r.right),
          left: Math.round(r.left),
        })
        if (spilled.length >= 8) break
      }
    }

    return { documentOverflow, scrollWidth, clientWidth, spilled }
  })
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await measureHorizontalOverflow(page)
  // Allow a few subpixels / scrollbar gutter noise (tablet often reports ~2–3px).
  expect(
    metrics.scrollWidth <= metrics.clientWidth + 4,
    `${label}: document scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
  ).toBe(true)
  expect(
    metrics.spilled,
    `${label}: elements spilled outside viewport: ${JSON.stringify(metrics.spilled)}`,
  ).toEqual([])
}

export async function settleDashboard(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(400)
}
