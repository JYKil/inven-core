import { Page, expect } from '@playwright/test'

// 테스트 계정 — 환경변수 또는 기본값
export const TEST_EMAIL = process.env.E2E_EMAIL || 'kilga2401@naver.com'
export const TEST_PASSWORD = process.env.E2E_PASSWORD || '24012401'

/**
 * 로그인 수행
 * 이미 로그인 상태면 스킵
 */
export async function login(page: Page) {
  await page.goto('/')

  // 이미 대시보드에 있으면 스킵
  if (page.url().includes('/login') || page.url().includes('/signup')) {
    await page.goto('/login')
    await page.fill('input#email', TEST_EMAIL)
    await page.fill('input#password', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    // 대시보드로 리다이렉트 대기
    await page.waitForURL('/', { timeout: 10_000 })
  }

  await expect(page.locator('h1', { hasText: '대시보드' })).toBeVisible({ timeout: 10_000 })
}

/**
 * Sonner 토스트 메시지 확인
 */
export async function expectToast(page: Page, text: string) {
  const toast = page.locator('[data-sonner-toast]', { hasText: text })
  await expect(toast).toBeVisible({ timeout: 5_000 })
}

/**
 * Select (Base UI) 에서 옵션 선택
 * placeholder: Select 트리거의 placeholder 텍스트
 * optionText: 선택할 옵션의 텍스트 (부분 매치). 빈 문자열이면 첫 번째 옵션
 */
export async function selectOption(page: Page, placeholder: string, optionText: string) {
  // placeholder 텍스트로 트리거 찾기
  const trigger = page.locator('button, [role="combobox"]', { hasText: placeholder })
  await trigger.first().click()

  // 옵션 선택
  if (optionText) {
    const option = page.locator('[role="option"]', { hasText: optionText })
    await option.first().click()
  } else {
    // 첫 번째 옵션 선택
    const option = page.locator('[role="option"]').first()
    await option.waitFor({ timeout: 3_000 })
    await option.click()
  }
}

/**
 * 고유한 테스트 ID 생성 (중복 방지)
 */
export function uniqueId(prefix: string) {
  const ts = Date.now().toString(36).slice(-4)
  const rand = Math.random().toString(36).slice(-3)
  return `${prefix}-${ts}${rand}`
}
