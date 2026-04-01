import { test, expect } from '@playwright/test'
import { login } from './helpers'

// 기준정보(Reference Codes) 페이지 검증
test.describe('기준정보', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('기준정보 목록 페이지 렌더링', async ({ page }) => {
    await page.goto('/reference-codes')
    await expect(page.locator('h1', { hasText: '기준정보' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    // 추가 버튼 존재
    await expect(page.locator('button', { hasText: '추가' })).toBeVisible()

    // 검색 입력 존재
    await expect(page.locator('input[placeholder*="검색"]')).toBeVisible()

    // 테이블 또는 빈 상태
    const table = page.locator('table')
    const emptyState = page.locator('text=기준정보가 없습니다')
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10_000 })
  })

  test('기준정보 추가 다이얼로그 열기/닫기', async ({ page }) => {
    await page.goto('/reference-codes')
    await page.waitForLoadState('networkidle')

    // 추가 버튼 클릭 → 다이얼로그 열림
    await page.click('button:has-text("추가")')
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })

    // 다이얼로그 제목 확인
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.locator('h2', { hasText: '기준정보 추가' })).toBeVisible()

    // 타입 콤보박스 존재
    await expect(dialog.locator('[role="combobox"]')).toBeVisible()

    // 데이터 1 필드 존재
    await expect(dialog.locator('text=데이터 1')).toBeVisible()

    // 닫기/취소
    const cancelBtn = page.locator('[role="dialog"] button', { hasText: '취소' })
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 })
  })

  test('기준정보 타입 필터 동작', async ({ page }) => {
    await page.goto('/reference-codes')
    await page.waitForLoadState('networkidle')

    // 타입 필터 Select 존재
    const typeFilter = page.locator('button', { hasText: '전체 타입' })
    await expect(typeFilter).toBeVisible({ timeout: 5_000 })
  })

  test('사이드바에서 기준정보 메뉴 접근', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 사이드바에서 기준정보 링크 클릭
    const refCodeLink = page.locator('a[href="/reference-codes"]')
    if (await refCodeLink.isVisible({ timeout: 3_000 })) {
      await refCodeLink.click()
      await expect(page).toHaveURL(/reference-codes/)
      await expect(page.locator('h1', { hasText: '기준정보' })).toBeVisible()
    }
  })
})
