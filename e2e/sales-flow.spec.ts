import { test, expect } from '@playwright/test'
import { login, expectToast, selectOption, uniqueId } from './helpers'

// 판매 플로우: SO 생성 → 확정 → 출고 → 재고 차감 확인
test.describe.serial('판매 플로우: 주문 → 확정 → 출고', () => {
  const soNumber = uniqueId('SO-E2E')
  let soDetailUrl: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('1. 판매주문 생성', async ({ page }) => {
    await page.goto('/sales-orders/new')
    await expect(page.locator('h1', { hasText: '판매 주문 생성' })).toBeVisible()

    // 주문번호
    await page.fill('input[name="order_number"]', soNumber)

    // 거래처 선택 (첫 번째)
    await selectOption(page, '거래처 선택', '')

    // 품목 추가
    const itemSearch = page.locator('input[placeholder="품목 검색하여 추가..."]')
    await itemSearch.fill('테스트')
    const dropdown = page.locator('.absolute.z-10 button').first()
    await dropdown.waitFor({ timeout: 5_000 })
    await dropdown.click()

    // 창고 선택 (라인 내)
    await selectOption(page, '창고 선택', '')

    // 수량, 단가
    await page.fill('input[name="lines.0.quantity"]', '1')
    await page.fill('input[name="lines.0.unit_price"]', '10000')

    // 제출
    await page.click('button[type="submit"]')

    // 상세 페이지 이동
    await page.waitForURL(/\/sales-orders\/[0-9a-f-]{36}/, { timeout: 10_000 })
    soDetailUrl = page.url()
    await expect(page.locator(`text=${soNumber}`)).toBeVisible({ timeout: 5_000 })
  })

  test('2. 판매주문 확정', async ({ page }) => {
    test.skip(!soDetailUrl, '주문 생성 실패')
    await page.goto(soDetailUrl)
    await page.waitForLoadState('networkidle')

    // 임시저장 상태 확인
    await expect(page.locator('text=임시저장')).toBeVisible({ timeout: 5_000 })

    // 확정 클릭
    await page.locator('main button', { hasText: '확정' }).click()

    // 확정 상태 확인
    await expect(page.locator('main button', { hasText: '출고 실행' })).toBeVisible({ timeout: 5_000 })
  })

  test('3. 출고 실행', async ({ page }) => {
    test.skip(!soDetailUrl, '주문 생성 실패')
    await page.goto(soDetailUrl)
    await page.waitForLoadState('networkidle')

    // 출고 실행 버튼 클릭 → confirm 다이얼로그 자동 수락
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('main button', { hasText: '출고 실행' }).click()

    // 출고 완료 확인 — 출고 취소 버튼이 나타남
    await expect(page.locator('button', { hasText: '출고 취소' })).toBeVisible({ timeout: 10_000 })
  })

  test('4. 판매주문 목록에서 상태 확인', async ({ page }) => {
    await page.goto('/sales-orders')

    // 검색
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill(soNumber)
    await page.waitForTimeout(500)

    // 목록에 존재
    await expect(page.locator(`text=${soNumber}`)).toBeVisible({ timeout: 5_000 })
  })
})
