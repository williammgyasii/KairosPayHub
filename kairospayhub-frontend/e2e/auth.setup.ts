import { test as setup, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(rootDir, '.auth/user.json')

setup('authenticate pastordev user', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL
  const password = process.env.PLAYWRIGHT_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Missing PLAYWRIGHT_EMAIL / PLAYWRIGHT_PASSWORD. Copy e2e/env.example to .env.e2e.local',
    )
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
  await expect(page.locator('main, [data-slot="sidebar"], header').first()).toBeVisible({
    timeout: 30_000,
  })

  await page.context().storageState({ path: authFile })
})
