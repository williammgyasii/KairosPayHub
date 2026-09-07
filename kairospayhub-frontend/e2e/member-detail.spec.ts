import { test, expect } from '@playwright/test'
import {
  VIEWPORTS,
  expectNoHorizontalOverflow,
  settleDashboard,
  type ViewportName,
} from './helpers/overflow'

const VIEWPORT_NAMES = Object.keys(VIEWPORTS) as ViewportName[]

async function openFirstMemberMenu(page: import('@playwright/test').Page) {
  await page.goto('/roster/membership')
  await settleDashboard(page)
  const action = page.getByRole('button', { name: /Actions for /i }).first()
  await expect(action).toBeVisible({ timeout: 30_000 })
  await action.click()
  return action
}

test.describe('member detail pages', () => {
  test('menu navigates to profile, attendance, and givings', async ({ page }) => {
    await openFirstMemberMenu(page)
    await page.getByRole('menuitem', { name: 'View profile' }).click()
    await expect(page).toHaveURL(/\/roster\/members\/[^/]+$/)
    await settleDashboard(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Membership')

    const memberPath = page.url().replace(/\/$/, '')
    await page.goto(`${memberPath}/attendance`)
    await settleDashboard(page)
    await expect(page.getByRole('link', { name: 'Attendance', exact: true })).toBeVisible()

    await page.goto(`${memberPath}/givings`)
    await settleDashboard(page)
    await expect(page.getByRole('link', { name: 'Givings', exact: true })).toBeVisible()
  })

  test('live API contracts for member + attendance history', async ({ request }) => {
    const email = process.env.PLAYWRIGHT_EMAIL
    const password = process.env.PLAYWRIGHT_PASSWORD
    expect(email && password, 'PLAYWRIGHT_EMAIL / PLAYWRIGHT_PASSWORD required').toBeTruthy()

    const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:5192'
    const login = await request.post(`${apiBase}/auth/login`, {
      data: { email, password },
    })
    expect(login.ok(), await login.text()).toBeTruthy()
    const tokens = await login.json()
    const token = tokens.accessToken as string
    expect(token).toBeTruthy()

    const members = await request.get(`${apiBase}/api/structure/members?page=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(members.ok(), await members.text()).toBeTruthy()
    const list = await members.json()
    expect(list.items?.length).toBeGreaterThan(0)
    const memberId = list.items[0].id as string

    const one = await request.get(`${apiBase}/api/structure/members/${memberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(one.ok(), await one.text()).toBeTruthy()
    const profile = await one.json()
    expect(profile.id).toBe(memberId)
    expect(profile.name).toBeTruthy()

    const history = await request.get(
      `${apiBase}/api/attendance/members/${memberId}/history?page=1&pageSize=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(history.ok(), await history.text()).toBeTruthy()
    const hist = await history.json()
    expect(hist).toHaveProperty('items')
    expect(hist).toHaveProperty('summary')
    expect(hist).toHaveProperty('meetingTypes')
    expect(Array.isArray(hist.meetingTypes)).toBe(true)
    expect(hist.meetingTypes.length).toBeGreaterThan(0)
    expect(hist.meetingTypes[0]).toMatchObject({
      meetingTypeId: expect.any(String),
      title: expect.any(String),
      presentCount: expect.any(Number),
      absentCount: expect.any(Number),
      recordedCount: expect.any(Number),
    })
    expect(hist.summary).toMatchObject({
      presentCount: expect.any(Number),
      absentCount: expect.any(Number),
      recordedCount: expect.any(Number),
    })

    const typeId = hist.meetingTypes[0].meetingTypeId as string
    const filtered = await request.get(
      `${apiBase}/api/attendance/members/${memberId}/history?meetingTypeId=${typeId}&page=1&pageSize=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(filtered.ok(), await filtered.text()).toBeTruthy()
    const scoped = await filtered.json()
    expect(scoped.meetingTypeId).toBe(typeId)
    for (const item of scoped.items ?? []) {
      expect(item.meetingTypeId).toBe(typeId)
    }
  })

  test('attendance page scopes by meeting type tabs', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_EMAIL
    const password = process.env.PLAYWRIGHT_PASSWORD
    expect(email && password).toBeTruthy()

    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
    await settleDashboard(page)

    // Known Canada Church member with Sunday Service history
    await page.goto('/roster/members/6b788607-0977-4728-b08c-5ef577872ab6/attendance')
    await settleDashboard(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })

    const meetingNav = page.getByRole('navigation', { name: 'Meeting types' })
    await expect(meetingNav).toBeVisible({ timeout: 30_000 })
    await expect(meetingNav.getByRole('button', { name: /Sunday Service/i })).toBeVisible()
    await expect(meetingNav.getByRole('button', { name: /Midweek Service/i })).toBeVisible()

    await meetingNav.getByRole('button', { name: /Midweek Service/i }).click()
    await settleDashboard(page)
    await expect(meetingNav.getByRole('button', { name: /Midweek Service/i })).toHaveClass(
      /text-primary/,
    )
    await expect(page.getByText(/^Present$/i).first()).toBeVisible()
    await expect(
      page.getByText(/No attendance records yet .* in this meeting type/i),
    ).toBeVisible()
  })
})

for (const viewport of VIEWPORT_NAMES) {
  test.describe(`member pages overflow @ ${viewport}`, () => {
    test.use({ viewport: VIEWPORTS[viewport] })

    test('membership roster + profile have no page overflow', async ({ page }) => {
      await page.goto('/roster/membership')
      await settleDashboard(page)
      await expectNoHorizontalOverflow(page, `membership (${viewport})`)

      const action = page.getByRole('button', { name: /Actions for /i }).first()
      if (!(await action.isVisible().catch(() => false))) return
      await action.click()
      await page.getByRole('menuitem', { name: 'View profile' }).click()
      await settleDashboard(page)
      await expectNoHorizontalOverflow(page, `member profile (${viewport})`)
    })
  })
}
