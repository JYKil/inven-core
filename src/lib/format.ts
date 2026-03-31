// 숫자 포맷 유틸 — DESIGN.md 기준

// 정수 단위 (EA, BOX, PCS, SET, ROLL, SHEET)
const integerUnits = new Set(['EA', 'BOX', 'PCS', 'SET', 'ROLL', 'SHEET'])

// 수량 포맷: 정수 단위는 정수, 소수 단위는 소수4자리
export function formatQty(value: number | null | undefined, unit = 'EA'): string {
  if (value == null) return '-'
  if (integerUnits.has(unit.toUpperCase())) {
    return Math.round(value).toLocaleString('ko-KR')
  }
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

// 단가 포맷: 최대 소수4자리 (후행 0 제거) + ₩
export function formatUnitPrice(value: number | null | undefined): string {
  if (value == null) return '-'
  return `₩${value.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`
}

// 금액 포맷: 정수 + ₩ (원화는 소수점 불필요)
export function formatAmount(value: number | null | undefined): string {
  if (value == null) return '-'
  return `₩${Math.round(value).toLocaleString('ko-KR')}`
}

// 비율 포맷: 소수1자리 + %
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '-'
  return `${value.toFixed(1)}%`
}

// 날짜 포맷 (YYYY-MM-DD)
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
