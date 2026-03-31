import { test, expect } from '@playwright/test'
import { TEST_EMAIL, TEST_PASSWORD, login } from './helpers'

test.describe('인증 플로우', () => {
  test('로그인 페이지가 표시된다', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h2', { hasText: '로그인' })).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]', { hasText: '로그인' })).toBeVisible()
  })

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input#email', 'wrong@test.com')
    await page.fill('input#password', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(
      page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')
    ).toBeVisible({ timeout: 5_000 })
  })

  test('올바른 자격증명으로 로그인 성공 → 대시보드', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1', { hasText: '대시보드' })).toBeVisible()
  })

  test('미인증 사용자는 /login으로 리다이렉트', async ({ page }) => {
    // 쿠키 없는 새 컨텍스트
    await page.goto('/purchase-orders')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })
})
