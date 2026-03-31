import { test, expect } from '@playwright/test'
import { login } from './helpers'

// 대시보드 위젯 렌더링 검증
test.describe('대시보드', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('대시보드 위젯이 모두 렌더링된다', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1', { hasText: '대시보드' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    // 처리 대기 섹션
    await expect(page.locator('text=처리 대기').first()).toBeVisible({ timeout: 10_000 })

    // 이번 달 매입/매출 섹션
    await expect(page.locator('text=이번 달 매입').first()).toBeVisible()
    await expect(page.locator('text=이번 달 매출').first()).toBeVisible()
  })

  test('재발주 알람 위젯이 표시된다', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 재발주 알람 섹션 (데이터 유무와 관계없이 섹션 제목은 존재)
    const reorderSection = page.locator('text=재발주 필요')
      .or(page.locator('text=재발주 알람'))
    await expect(reorderSection.first()).toBeVisible({ timeout: 10_000 })
  })

  test('대시보드 링크가 올바르게 작동한다', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 퀵 액션이나 처리 대기 카드의 링크 클릭 시 올바른 페이지 이동
    // (온보딩 상태에 따라 다른 위젯이 표시될 수 있어 유연하게 검증)
    const anyLink = page.locator('main a[href]').first()
    if (await anyLink.isVisible()) {
      const href = await anyLink.getAttribute('href')
      await anyLink.click()
      // 링크 클릭 후 페이지 로드
      await page.waitForLoadState('networkidle')
      // 404가 아닌지 확인
      await expect(page.locator('text=404')).not.toBeVisible()
      expect(href).toBeTruthy()
    }
  })
})
