import { expect, test } from '@playwright/test'

test('root redirects into the auth flow', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(page.locator('body')).toContainText(
    /Clerk configuration is required|Welcome back to your publishing workspace/i,
  )
})
