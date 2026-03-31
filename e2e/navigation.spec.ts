import { test, expect } from '@playwright/test'
import { login } from './helpers'

// 주요 페이지 네비게이션 스모크 테스트
test.describe('페이지 네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  const pages = [
    { path: '/', title: '대시보드' },
    { path: '/partners', title: '거래처' },
    { path: '/warehouses', title: '창고' },
    { path: '/items', title: '품목 관리' },
    { path: '/purchase-orders', title: '발주서' },
    { path: '/goods-receipts', title: '입고' },
    { path: '/po-payments', title: '지급 관리' },
    { path: '/assembly-orders', title: '조립 지시' },
    { path: '/sales-orders', title: '판매 주문' },
    { path: '/inventory', title: '재고 현황' },
    { path: '/warehouse-transfers', title: '창고 이동' },
    { path: '/reports/inventory-ledger', title: '재고 수불부' },
    { path: '/reports/warehouse-stock', title: '창고별 재고' },
    { path: '/reports/sales', title: '매출 보고서' },
    { path: '/settings', title: '회사 설정' },
  ]

  for (const { path, title } of pages) {
    test(`${path} → "${title}" 표시`, async ({ page }) => {
      await page.goto(path)
      // h1에 제목이 표시되는지 확인 (부분 매치)
      await expect(page.locator('h1').first()).toContainText(title, { timeout: 10_000 })
    })
  }
})
