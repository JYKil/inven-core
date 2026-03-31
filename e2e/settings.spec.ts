import { test, expect } from '@playwright/test'
import { login } from './helpers'

// 설정 페이지 검증
test.describe('설정', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('회사 설정 페이지 렌더링', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('h1', { hasText: '회사 설정' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    // 회사명 필드 존재
    await expect(page.locator('text=회사명')).toBeVisible({ timeout: 5_000 })

    // 초대 코드 표시
    await expect(page.locator('text=초대 코드')).toBeVisible()
  })

  test('사용자 관리 페이지 렌더링', async ({ page }) => {
    await page.goto('/settings/users')
    await expect(page.locator('h1', { hasText: '사용자 관리' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    // 사용자 테이블 또는 빈 상태
    const table = page.locator('table')
    const emptyMsg = page.locator('text=사용자가 없습니다')
    await expect(table.or(emptyMsg)).toBeVisible({ timeout: 10_000 })
  })

  test('설정 탭 네비게이션', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // "사용자 관리" 탭/링크가 있으면 클릭
    const usersLink = page.locator('a', { hasText: '사용자 관리' })
      .or(page.locator('button', { hasText: '사용자 관리' }))
    if (await usersLink.first().isVisible()) {
      await usersLink.first().click()
      await page.waitForURL(/\/settings\/users/, { timeout: 5_000 })
      await expect(page.locator('h1', { hasText: '사용자 관리' })).toBeVisible()
    }
  })
})
