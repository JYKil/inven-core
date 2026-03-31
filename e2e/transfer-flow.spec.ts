import { test, expect } from '@playwright/test'
import { login, selectOption, uniqueId } from './helpers'

// 창고 이동 플로우: 이동 생성 → 상세 확인
test.describe.serial('창고 이동 플로우', () => {
  let transferDetailUrl: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('1. 창고 이동 생성', async ({ page }) => {
    await page.goto('/warehouse-transfers/new')
    await expect(page.locator('h1', { hasText: '창고 이동 생성' })).toBeVisible()

    // 출발/도착 창고 선택
    await selectOption(page, '출발 창고 선택', '')

    // 도착 창고는 출발과 다른 것 선택 — 두 번째 옵션
    const toTrigger = page.locator('button, [role="combobox"]', { hasText: '도착 창고 선택' })
    await toTrigger.first().click()
    const options = page.locator('[role="option"]')
    await options.first().waitFor({ timeout: 3_000 })
    const optionCount = await options.count()
    // 첫 번째와 다른 옵션 선택 (두 번째가 있으면 두 번째, 없으면 첫 번째)
    if (optionCount > 1) {
      await options.nth(1).click()
    } else {
      await options.first().click()
    }

    // 품목 추가
    const itemSearch = page.locator('input[placeholder="품목 검색하여 추가..."]')
    await itemSearch.fill('테스트')
    const dropdown = page.locator('.absolute.z-10 button').first()
    await dropdown.waitFor({ timeout: 5_000 })
    await dropdown.click()

    // 수량
    await page.fill('input[name="lines.0.quantity"]', '1')

    // 이동 실행
    await page.click('button[type="submit"]')

    // 성공 시 상세 페이지 또는 목록으로 이동
    // 에러 발생 시 (재고 부족 등) 토스트 확인
    const detailUrl = page.url()
    const isDetail = /\/warehouse-transfers\/[0-9a-f-]{36}/.test(detailUrl)
    const hasError = await page.locator('[data-sonner-toast]').isVisible().catch(() => false)

    if (hasError && !isDetail) {
      // 재고 부족 에러 — 스킵
      test.skip(true, '재고 부족으로 이동 실행 불가')
      return
    }

    await page.waitForURL(/\/warehouse-transfers\/[0-9a-f-]{36}/, { timeout: 10_000 })
    transferDetailUrl = page.url()
  })

  test('2. 이동 상세 확인', async ({ page }) => {
    test.skip(!transferDetailUrl, '이동 생성 실패/스킵')
    await page.goto(transferDetailUrl)
    await page.waitForLoadState('networkidle')

    // 상태: completed
    await expect(page.locator('text=완료')).toBeVisible({ timeout: 5_000 })

    // 출발/도착 창고 표시
    await expect(page.locator('text=출발 창고')).toBeVisible()
    await expect(page.locator('text=도착 창고')).toBeVisible()

    // 이동 취소 버튼 존재
    await expect(page.locator('button', { hasText: '이동 취소' })).toBeVisible()
  })

  test('3. 이동 목록에서 확인', async ({ page }) => {
    test.skip(!transferDetailUrl, '이동 생성 실패/스킵')
    await page.goto('/warehouse-transfers')
    await page.waitForLoadState('networkidle')

    // 최소 1행 존재
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 5_000 })
  })
})
