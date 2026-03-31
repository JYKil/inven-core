import { test, expect } from '@playwright/test'
import { login, selectOption, uniqueId } from './helpers'

// 취소(롤백) 플로우: 출고 취소 시나리오
// 전제: SO 생성 → 확정 → 출고 → 출고 취소 → 재출고 가능 상태 확인
test.describe.serial('출고 취소 플로우', () => {
  const soNumber = uniqueId('CANCEL-E2E')
  let soDetailUrl: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('1. SO 생성 → 확정 → 출고', async ({ page }) => {
    // SO 생성
    await page.goto('/sales-orders/new')
    await page.fill('input[name="order_number"]', soNumber)
    await selectOption(page, '거래처 선택', '')

    // 품목 추가
    const itemSearch = page.locator('input[placeholder="품목 검색하여 추가..."]')
    await itemSearch.fill('테스트')
    const dropdown = page.locator('.absolute.z-10 button').first()
    await dropdown.waitFor({ timeout: 5_000 })
    await dropdown.click()

    await selectOption(page, '창고 선택', '')
    await page.fill('input[name="lines.0.quantity"]', '1')
    await page.fill('input[name="lines.0.unit_price"]', '5000')
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/sales-orders\/[0-9a-f-]{36}/, { timeout: 10_000 })
    soDetailUrl = page.url()

    // 확정
    await page.waitForLoadState('networkidle')
    await page.locator('main button', { hasText: '확정' }).click()
    await expect(page.locator('main button', { hasText: '출고 실행' })).toBeVisible({ timeout: 5_000 })

    // 출고
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('main button', { hasText: '출고 실행' }).click()
    await expect(page.locator('button', { hasText: '출고 취소' })).toBeVisible({ timeout: 10_000 })
  })

  test('2. 출고 취소 실행', async ({ page }) => {
    test.skip(!soDetailUrl, 'SO 생성 실패')
    await page.goto(soDetailUrl)
    await page.waitForLoadState('networkidle')

    // 출고 취소 버튼 클릭 → CancelDialog 열림
    await page.locator('button', { hasText: '출고 취소' }).click()

    // 취소 사유 입력
    const reasonInput = page.locator('textarea[placeholder="취소 사유를 입력하세요"]')
    await expect(reasonInput).toBeVisible({ timeout: 3_000 })
    await reasonInput.fill('E2E 테스트 — 출고 취소 검증')

    // 취소 실행 클릭
    await page.locator('button', { hasText: '취소 실행' }).click()

    // 확정 상태로 복귀 — 출고 실행 버튼 다시 표시
    await expect(page.locator('main button', { hasText: '출고 실행' })).toBeVisible({ timeout: 10_000 })

    // 취소 사유 표시
    await expect(page.locator('text=E2E 테스트 — 출고 취소 검증')).toBeVisible()
  })

  test('3. 취소 후 재출고 가능 확인', async ({ page }) => {
    test.skip(!soDetailUrl, 'SO 생성 실패')
    await page.goto(soDetailUrl)
    await page.waitForLoadState('networkidle')

    // 출고 실행 버튼이 활성화 상태
    const shipBtn = page.locator('main button', { hasText: '출고 실행' })
    await expect(shipBtn).toBeVisible({ timeout: 5_000 })
    await expect(shipBtn).toBeEnabled()
  })
})

// 입고 상세 페이지 접근 테스트 (신규 페이지 검증)
test.describe('입고 상세 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('입고 목록에서 상세 페이지로 이동', async ({ page }) => {
    await page.goto('/goods-receipts')
    await page.waitForLoadState('networkidle')

    // 입고 데이터가 있으면 첫 번째 행 클릭
    const firstRow = page.locator('table tbody tr').first()
    const hasData = await firstRow.isVisible().catch(() => false)
    if (!hasData) {
      test.skip(true, '입고 데이터 없음')
      return
    }

    // 행 클릭 또는 링크 클릭으로 상세 이동
    const link = firstRow.locator('a').first()
    if (await link.isVisible()) {
      await link.click()
    } else {
      await firstRow.click()
    }

    // 상세 페이지 로드 확인
    await page.waitForURL(/\/goods-receipts\/[0-9a-f-]{36}/, { timeout: 10_000 })

    // 기본 요소 확인
    await expect(page.locator('text=상태')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=입고 창고')).toBeVisible()
    await expect(page.locator('text=목록으로')).toBeVisible()
  })
})
