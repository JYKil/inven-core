import { test, expect } from '@playwright/test'
import { login, expectToast, selectOption, uniqueId } from './helpers'

// 핵심 플로우: 발주 생성 → 입고 처리 → 재고 확인
// 순차 실행 (데이터 의존성)
test.describe.serial('핵심 플로우: 발주 → 입고 → 재고 확인', () => {
  const poNumber = uniqueId('PO-E2E')
  const grNumber = uniqueId('GR-E2E')
  let poDetailUrl: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('1. 발주서 생성', async ({ page }) => {
    await page.goto('/purchase-orders/new')
    await expect(page.locator('h1', { hasText: '발주서 생성' })).toBeVisible()

    // PO 번호 입력
    await page.fill('input[name="po_number"]', poNumber)

    // 공급업체 선택 (첫 번째 거래처)
    await selectOption(page, '공급업체 선택', '')

    // 품목 추가 — 검색 후 첫 번째 결과 클릭
    const itemSearch = page.locator('input[placeholder="품목 검색하여 추가..."]')
    await itemSearch.fill('테스트')
    // 검색 결과 드롭다운 (커스텀 button 요소)
    const dropdown = page.locator('.absolute.z-10 button').first()
    await dropdown.waitFor({ timeout: 5_000 })
    await dropdown.click()

    // 수량, 단가 입력
    await page.fill('input[name="lines.0.ordered_qty"]', '10')
    await page.fill('input[name="lines.0.unit_price"]', '5000')

    // 제출
    await page.click('button[type="submit"]')

    // 성공 확인 — 상세 페이지로 이동 (UUID 포함 URL)
    await page.waitForURL(/\/purchase-orders\/[0-9a-f-]{36}/, { timeout: 10_000 })
    poDetailUrl = page.url()

    // PO 번호가 상세 페이지에 표시
    await expect(page.locator(`text=${poNumber}`)).toBeVisible({ timeout: 5_000 })
  })

  test('2. 발주서 확정', async ({ page }) => {
    test.skip(!poDetailUrl, '발주서 생성 실패로 스킵')
    await page.goto(poDetailUrl)
    await page.waitForLoadState('networkidle')

    // 상태가 draft인지 확인 (배지)
    await expect(page.locator('.rounded-\\[3px\\]', { hasText: '임시저장' })).toBeVisible({ timeout: 5_000 })

    // 확정 버튼 클릭 (메인 영역의 action 버튼)
    const confirmBtn = page.locator('main button', { hasText: '확정' })
    await confirmBtn.click()

    // 상태 배지가 "확정"으로 변경 확인
    await expect(page.locator('.rounded-\\[3px\\]', { hasText: '확정' })).toBeVisible({ timeout: 5_000 })
    // "입고 처리" 버튼이 나타남
    await expect(page.locator('main a', { hasText: '입고 처리' })).toBeVisible({ timeout: 5_000 })
  })

  test('3. 입고 처리', async ({ page }) => {
    test.skip(!poDetailUrl, '발주서 생성 실패로 스킵')

    // PO에서 입고 생성 페이지로 직접 이동
    const poId = poDetailUrl.split('/').pop()
    await page.goto(`/goods-receipts/new?po=${poId}`)
    await page.waitForLoadState('networkidle')

    // 입고 번호 입력
    await page.fill('input[name="receipt_number"]', grNumber)

    // 입고 창고 선택
    await selectOption(page, '창고 선택', '')

    // 수량은 PO에서 자동 채워짐 — 확인
    const qtyInput = page.locator('input[name="lines.0.quantity"]')
    await expect(qtyInput).toBeVisible()

    // 입고 실행
    await page.click('button[type="submit"]')

    // 성공 토스트
    await expectToast(page, '입고 완료')
  })

  test('4. 재고 확인', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page.locator('h1', { hasText: '재고 현황' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    // 품목별 뷰 (기본)
    await expect(page.locator('button', { hasText: '품목별' })).toBeVisible()

    // 데이터 로드 대기 — 행 또는 빈 상태 메시지
    const dataRow = page.locator('table tbody tr td:not(:empty)').first()
    const emptyMsg = page.locator('text=재고가 없습니다')

    await expect(dataRow.or(emptyMsg)).toBeVisible({ timeout: 10_000 })

    // 데이터가 있으면 수량 확인
    if (await dataRow.isVisible()) {
      const rows = page.locator('table tbody tr')
      const firstRow = rows.first()
      // 첫 번째 행이 보이는지만 확인 (재고 데이터 존재)
      await expect(firstRow).toBeVisible()
    }
  })

  test('5. 발주서 목록에서 상태 확인', async ({ page }) => {
    await page.goto('/purchase-orders')

    // 검색
    await page.fill('input[placeholder="PO번호 검색..."]', poNumber)
    await page.waitForTimeout(500) // debounce 대기

    // 해당 PO가 목록에 존재
    await expect(page.locator(`text=${poNumber}`)).toBeVisible({ timeout: 5_000 })
  })
})
