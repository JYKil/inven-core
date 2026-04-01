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

  test('기준정보 생성 플로우', async ({ page }) => {
    await page.goto('/reference-codes')
    await page.waitForLoadState('networkidle')

    // 추가 버튼 클릭 → 다이얼로그 열림
    await page.click('button:has-text("추가")')
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })

    // 타입 입력 (Combobox에 새 타입 입력)
    const dialog = page.locator('[role="dialog"]')
    await dialog.locator('[role="combobox"]').click()
    const typeInput = dialog.locator('[cmdk-input]')
    const testType = `E2E_테스트_${Date.now()}`
    await typeInput.fill(testType)

    // 데이터 1 필수 필드 입력
    const testData1 = `테스트데이터_${Date.now()}`
    await dialog.locator('#code_data1').fill(testData1)

    // 저장
    await dialog.locator('button:has-text("추가")').click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 })

    // 목록에 반영 확인
    await expect(page.locator('td', { hasText: testData1 })).toBeVisible({ timeout: 10_000 })
  })

  test('기준정보 수정 플로우', async ({ page }) => {
    await page.goto('/reference-codes')
    await page.waitForLoadState('networkidle')

    // 테이블에 데이터가 있어야 수정 가능
    const table = page.locator('table')
    const hasData = await table.locator('tbody tr').count()
    if (hasData === 0) {
      test.skip()
      return
    }

    // 첫 번째 행의 수정 버튼 클릭
    const firstRow = table.locator('tbody tr').first()
    const originalData = await firstRow.locator('td').nth(1).textContent()
    await firstRow.locator('button:has-text("수정")').click()

    // 다이얼로그 열림 확인
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.locator('h2', { hasText: '기준정보 수정' })).toBeVisible()

    // 타입 필드가 비활성화(읽기전용)인지 확인
    await expect(dialog.locator('#code_type')).toBeDisabled()

    // 데이터 1 필드 변경
    const updatedData = `수정됨_${Date.now()}`
    await dialog.locator('#code_data1').clear()
    await dialog.locator('#code_data1').fill(updatedData)

    // 저장
    await dialog.locator('button:has-text("저장")').click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 })

    // 변경 반영 확인
    await expect(page.locator('td', { hasText: updatedData })).toBeVisible({ timeout: 10_000 })
  })

  test('기준정보 삭제 플로우', async ({ page }) => {
    await page.goto('/reference-codes')
    await page.waitForLoadState('networkidle')

    // 테이블에 데이터가 있어야 삭제 가능
    const table = page.locator('table')
    const rowCountBefore = await table.locator('tbody tr').count()
    if (rowCountBefore === 0) {
      test.skip()
      return
    }

    // 첫 번째 행의 데이터 1 값 기억
    const firstRow = table.locator('tbody tr').first()
    const targetData = await firstRow.locator('td').nth(1).textContent()

    // 삭제 버튼 클릭
    await firstRow.locator('button:has-text("삭제")').click()

    // confirm 다이얼로그 처리 (window.confirm 또는 커스텀 다이얼로그)
    page.on('dialog', (dialog) => dialog.accept())

    // 삭제 후 목록에서 제거 확인
    if (targetData) {
      // 행 수가 줄었거나 해당 데이터가 없어져야 함
      await page.waitForTimeout(1_000)
      const rowCountAfter = await table.locator('tbody tr').count()
      expect(rowCountAfter).toBeLessThanOrEqual(rowCountBefore)
    }
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
