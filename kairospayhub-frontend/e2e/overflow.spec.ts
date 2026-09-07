import { test, expect } from '@playwright/test'
import {
  VIEWPORTS,
  expectNoHorizontalOverflow,
  settleDashboard,
  type ViewportName,
} from './helpers/overflow'

const VIEWPORT_NAMES = Object.keys(VIEWPORTS) as ViewportName[]

async function resolveProgramPath(page: import('@playwright/test').Page): Promise<string> {
  const pinned = process.env.PLAYWRIGHT_PROGRAM_PATH
  if (pinned) return pinned

  await page.goto('/givings')
  await settleDashboard(page)

  const link = page.locator('a[href^="/givings/"]').filter({ hasNotText: /transactions|overall/i }).first()
  await expect(link).toBeVisible({ timeout: 30_000 })
  const href = await link.getAttribute('href')
  if (!href) throw new Error('No campaign link found on /givings')
  return href
}

for (const viewport of VIEWPORT_NAMES) {
  test.describe(`no page overflow @ ${viewport}`, () => {
    test.use({ viewport: VIEWPORTS[viewport] })

    test('home dashboard', async ({ page }) => {
      await page.goto('/')
      await settleDashboard(page)
      await expectNoHorizontalOverflow(page, `home (${viewport})`)
    })

    test('givings list', async ({ page }) => {
      await page.goto('/givings')
      await settleDashboard(page)
      await expectNoHorizontalOverflow(page, `givings list (${viewport})`)
    })

    test('campaign detail (dashboard + member givings)', async ({ page }) => {
      const programPath = await resolveProgramPath(page)
      await page.goto(programPath)
      await settleDashboard(page)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectNoHorizontalOverflow(page, `campaign dashboard (${viewport})`)

      const memberTab = page.getByRole('button', { name: /member givings/i })
      if (await memberTab.isVisible()) {
        await memberTab.click()
        await settleDashboard(page)
        await expectNoHorizontalOverflow(page, `campaign member givings (${viewport})`)
      }

      const txTab = page.getByRole('button', { name: /^transactions/i })
      if (await txTab.isVisible()) {
        await txTab.click()
        await settleDashboard(page)
        await expectNoHorizontalOverflow(page, `campaign transactions (${viewport})`)
      }
    })
  })
}
