import { test, expect } from '@playwright/test'
import { login, selectOption, uniqueId } from './helpers'

// 조립 플로우: 조립 생성(BOM 선택 + 재료 가용성 확인) → 실행 → 상세 확인
test.describe.serial('조립 플로우: BOM 선택 → 조립 실행', () => {
  const asmNumber = uniqueId('ASM-E2E')
  let asmDetailUrl: string

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('1. 조립 생성', async ({ page }) => {
    await page.goto('/assembly-orders/new')
    await expect(page.locator('h1', { hasText: '조립 생성' })).toBeVisible()

    // 조립번호
    await page.fill('input[name="order_number"]', asmNumber)

    // 결과 품목 선택
    await selectOption(page, '품목 선택', '')

    // BOM이 로드될 때까지 대기 후 선택
    const bomSelect = page.locator('[role="combobox"]', { hasText: /BOM/ }).or(
      page.locator('button', { hasText: 'BOM 선택' })
    )
    await bomSelect.first().waitFor({ timeout: 5_000 })
    await selectOption(page, 'BOM 선택', '')

    // 창고 선택
    await selectOption(page, '창고 선택', '')

    // 수량 입력
    await page.fill('input[name="quantity"]', '1')

    // 재료 가용성 테이블 표시 대기
    const materialTable = page.locator('text=재료 품목').or(page.locator('text=필요 수량'))
    await materialTable.first().waitFor({ timeout: 5_000 })

    // 조립 실행 버튼이 활성화되었는지 확인
    const submitBtn = page.locator('button[type="submit"]', { hasText: '조립 실행' })

    // 재료 부족 시 비활성 — 이 경우 테스트 스킵
    if (await submitBtn.isDisabled()) {
      test.skip(true, '재료 부족으로 조립 실행 불가 — 선행 입고 데이터 필요')
      return
    }

    await submitBtn.click()

    // 상세 페이지 이동
    await page.waitForURL(/\/assembly-orders\/[0-9a-f-]{36}/, { timeout: 10_000 })
    asmDetailUrl = page.url()
    await expect(page.locator(`text=${asmNumber}`)).toBeVisible({ timeout: 5_000 })
  })

  test('2. 조립 상세 확인', async ({ page }) => {
    test.skip(!asmDetailUrl, '조립 생성 실패/스킵')
    await page.goto(asmDetailUrl)
    await page.waitForLoadState('networkidle')

    // 상태: completed
    await expect(page.locator('text=완료')).toBeVisible({ timeout: 5_000 })

    // 원가 정보 표시
    await expect(page.locator('text=총 원가')).toBeVisible()

    // 재료 소비 내역 테이블
    await expect(page.locator('text=재료 품목')).toBeVisible()

    // 취소 버튼 존재
    await expect(page.locator('button', { hasText: '조립 취소' })).toBeVisible()
  })

  test('3. 조립 목록에서 확인', async ({ page }) => {
    test.skip(!asmDetailUrl, '조립 생성 실패/스킵')
    await page.goto('/assembly-orders')

    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill(asmNumber)
    await page.waitForTimeout(500)

    await expect(page.locator(`text=${asmNumber}`)).toBeVisible({ timeout: 5_000 })
  })
})
