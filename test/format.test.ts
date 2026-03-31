import { describe, it, expect } from 'vitest'
import { formatQty, formatUnitPrice, formatAmount, formatPercent, formatDate } from '@/lib/format'

describe('formatQty', () => {
  it('정수 단위(EA)는 정수로 표시', () => {
    expect(formatQty(1234, 'EA')).toBe('1,234')
  })

  it('소수 단위(KG)는 소수4자리로 표시', () => {
    expect(formatQty(12.5, 'KG')).toBe('12.5000')
  })

  it('null이면 - 반환', () => {
    expect(formatQty(null)).toBe('-')
  })

  it('undefined이면 - 반환', () => {
    expect(formatQty(undefined)).toBe('-')
  })
})

describe('formatAmount', () => {
  it('금액에 ₩ 접두사와 소수2자리 표시', () => {
    expect(formatAmount(10000)).toBe('₩10,000.00')
  })

  it('null이면 - 반환', () => {
    expect(formatAmount(null)).toBe('-')
  })
})

describe('formatPercent', () => {
  it('소수1자리 + % 표시', () => {
    expect(formatPercent(85.67)).toBe('85.7%')
  })
})

describe('formatDate', () => {
  it('한국어 날짜 포맷', () => {
    const result = formatDate('2026-03-31')
    expect(result).toMatch(/2026/)
  })

  it('빈 값이면 - 반환', () => {
    expect(formatDate(null)).toBe('-')
  })
})
