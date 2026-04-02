import { describe, it, expect } from 'vitest'
import { formatQty, formatUnitPrice, formatAmount, formatPercent, formatDate } from '@/lib/format'

describe('formatQty', () => {
  it('정수 단위(EA)는 정수로 표시', () => {
    expect(formatQty(1234, 'EA')).toBe('1,234')
  })

  it('소수 단위(KG)도 정수로 표시', () => {
    expect(formatQty(12.5, 'KG')).toBe('13')
  })

  it('null이면 - 반환', () => {
    expect(formatQty(null)).toBe('-')
  })

  it('undefined이면 - 반환', () => {
    expect(formatQty(undefined)).toBe('-')
  })

  it('0은 정상 표시', () => {
    expect(formatQty(0, 'EA')).toBe('0')
  })

  it('BOX/PCS/SET도 정수 단위', () => {
    expect(formatQty(5.7, 'BOX')).toBe('6')
    expect(formatQty(3, 'PCS')).toBe('3')
    expect(formatQty(2.1, 'SET')).toBe('2')
  })

  it('소문자 단위도 정수 처리', () => {
    expect(formatQty(10, 'ea')).toBe('10')
  })
})

describe('formatUnitPrice', () => {
  it('정수 단가도 소수점 5자리로 표시', () => {
    expect(formatUnitPrice(1500)).toBe('1,500.00000')
  })

  it('소수점 있는 단가는 5자리까지 표시', () => {
    expect(formatUnitPrice(0.006)).toBe('0.00600')
  })

  it('소수 2자리 단가도 5자리로 표시', () => {
    expect(formatUnitPrice(100.55)).toBe('100.55000')
  })

  it('null이면 - 반환', () => {
    expect(formatUnitPrice(null)).toBe('-')
  })

  it('undefined이면 - 반환', () => {
    expect(formatUnitPrice(undefined)).toBe('-')
  })

  it('0은 0.00000', () => {
    expect(formatUnitPrice(0)).toBe('0.00000')
  })
})

describe('formatAmount', () => {
  it('금액은 소수점 2자리로 표시', () => {
    expect(formatAmount(10000)).toBe('10,000.00')
  })

  it('null이면 - 반환', () => {
    expect(formatAmount(null)).toBe('-')
  })

  it('0은 0.00', () => {
    expect(formatAmount(0)).toBe('0.00')
  })

  it('소수점 값은 2자리까지 표시', () => {
    expect(formatAmount(10000.75)).toBe('10,000.75')
  })
})

describe('formatPercent', () => {
  it('소수1자리 + % 표시', () => {
    expect(formatPercent(85.67)).toBe('85.7%')
  })

  it('null이면 - 반환', () => {
    expect(formatPercent(null)).toBe('-')
  })

  it('0%', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('100%', () => {
    expect(formatPercent(100)).toBe('100.0%')
  })
})

describe('formatDate', () => {
  it('YYYY-MM-DD 포맷으로 표시', () => {
    expect(formatDate('2026-03-31')).toBe('2026-03-31')
  })

  it('ISO 날짜도 YYYY-MM-DD로 변환', () => {
    // UTC 시각이 로컬 타임존에 맞게 변환됨
    const result = formatDate('2026-03-31T03:00:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('null이면 - 반환', () => {
    expect(formatDate(null)).toBe('-')
  })

  it('undefined이면 - 반환', () => {
    expect(formatDate(undefined)).toBe('-')
  })

  it('빈 문자열이면 - 반환', () => {
    expect(formatDate('')).toBe('-')
  })
})
