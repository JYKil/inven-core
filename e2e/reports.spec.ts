import { test, expect } from '@playwright/test'
import { login } from './helpers'

// 보고서 스모크 테스트: 필터 동작 + 데이터 렌더링 확인
test.describe('보고서', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('재고 수불부 — 필터 + 테이블 렌더링', async ({ page }) => {
    await page.goto('/reports/inventory-ledger')
    await expect(page.locator('h1', { hasText: '재고 수불부' })).toBeVisible()

    // 기본 날짜 필터가 채워져 있는지 확인
    const startDate = page.locator('input[type="date"]').first()
    const endDate = page.locator('input[type="date"]').nth(1)
    await expect(startDate).not.toBeEmpty()
    await expect(endDate).not.toBeEmpty()

    // 데이터 로드 대기
    await page.waitForLoadState('networkidle')

    // 거래 내역 테이블 또는 빈 상태 메시지
    const txTable = page.locator('text=거래 내역')
    const emptyMsg = page.locator('text=해당 기간의 거래 내역이 없습니다')
    await expect(txTable.or(emptyMsg)).toBeVisible({ timeout: 10_000 })

    // CSV 내보내기 버튼 존재
    await expect(page.locator('button', { hasText: 'CSV 내보내기' })).toBeVisible()
  })

  test('재고 수불부 — cancel 타입 라벨 매핑 확인', async ({ page }) => {
    await page.goto('/reports/inventory-ledger')
    await page.waitForLoadState('networkidle')

    // 거래 내역이 있는 경우만 검증
    const txTable = page.locator('table').last()
    const rows = txTable.locator('tbody tr')
    const hasData = await rows.first().isVisible().catch(() => false)

    if (!hasData) {
      test.skip(true, '거래 내역 없음')
      return
    }

    // 유형 컬럼에 영문 raw 타입이 표시되지 않는지 확인
    // (매핑 누락 시 purchase_in_cancel 등이 그대로 노출됨)
    const typeColumn = txTable.locator('tbody td:nth-child(5)')
    const count = await typeColumn.count()
    for (let i = 0; i < Math.min(count, 20); i++) {
      const text = await typeColumn.nth(i).textContent()
      // 영문 snake_case가 직접 노출되면 안 됨
      expect(text).not.toMatch(/^[a-z]+_[a-z]+$/)
    }
  })

  test('창고별 재고 — 테이블 렌더링', async ({ page }) => {
    await page.goto('/reports/warehouse-stock')
    await expect(page.locator('h1', { hasText: '창고별 재고' })).toBeVisible()

    await page.waitForLoadState('networkidle')

    // 데이터 또는 빈 상태
    const table = page.locator('table tbody tr').first()
    const emptyMsg = page.locator('text=재고 데이터가 없습니다')
    await expect(table.or(emptyMsg)).toBeVisible({ timeout: 10_000 })

    // CSV 버튼
    await expect(page.locator('button', { hasText: 'CSV 내보내기' })).toBeVisible()
  })

  test('매출 보고서 — 필터 + 요약 카드', async ({ page }) => {
    await page.goto('/reports/sales')
    await expect(page.locator('h1', { hasText: '매출 보고서' })).toBeVisible()

    // 날짜 필터
    const startDate = page.locator('input[type="date"]').first()
    const endDate = page.locator('input[type="date"]').nth(1)
    await expect(startDate).not.toBeEmpty()
    await expect(endDate).not.toBeEmpty()

    await page.waitForLoadState('networkidle')

    // 요약 카드 또는 빈 상태
    const summaryCard = page.locator('text=매출액')
    const emptyMsg = page.locator('text=해당 기간의 매출 데이터가 없습니다')
    await expect(summaryCard.or(emptyMsg)).toBeVisible({ timeout: 10_000 })

    // CSV 버튼
    await expect(page.locator('button', { hasText: 'CSV 내보내기' })).toBeVisible()
  })
})
