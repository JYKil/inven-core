import { describe, it, expect, vi } from 'vitest'
import { exportCsv, downloadCsv, buildCsvString, sanitizeCsvCell, type CsvColumn } from '@/lib/csv'

// --- 순수 함수 테스트 (DOM 불필요) ---

describe('sanitizeCsvCell', () => {
  it('일반 문자열은 그대로 반환', () => {
    expect(sanitizeCsvCell('hello')).toBe('hello')
  })

  it('= 접두사에 작은따옴표 추가', () => {
    expect(sanitizeCsvCell('=CMD()')).toBe("'=CMD()")
  })

  it('+ 접두사에 작은따옴표 추가', () => {
    expect(sanitizeCsvCell('+CMD()')).toBe("'+CMD()")
  })

  it('- 접두사에 작은따옴표 추가', () => {
    expect(sanitizeCsvCell('-CMD()')).toBe("'-CMD()")
  })

  it('@ 접두사에 작은따옴표 추가', () => {
    expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('탭 접두사에 작은따옴표 추가', () => {
    expect(sanitizeCsvCell('\tdata')).toBe("'\tdata")
  })
})

describe('buildCsvString', () => {
  it('헤더와 데이터를 CSV 형식으로 변환', () => {
    const result = buildCsvString(['이름', '수량'], [['사과', 10], ['배', 20]])
    const lines = result.split('\n')
    expect(lines[0]).toBe('이름,수량')
    expect(lines[1]).toBe('사과,10')
    expect(lines[2]).toBe('배,20')
  })

  it('null/undefined 셀은 빈 문자열로 변환', () => {
    const result = buildCsvString(['A', 'B'], [[null, undefined]])
    const lines = result.split('\n')
    expect(lines[1]).toBe(',')
  })

  it('쉼표 포함 셀은 큰따옴표로 감싸기', () => {
    const result = buildCsvString(['A'], [['a,b']])
    const lines = result.split('\n')
    expect(lines[1]).toBe('"a,b"')
  })

  it('큰따옴표 포함 셀은 이스케이프', () => {
    const result = buildCsvString(['A'], [['say "hello"']])
    const lines = result.split('\n')
    expect(lines[1]).toBe('"say ""hello"""')
  })

  it('줄바꿈 포함 셀은 큰따옴표로 감싸기', () => {
    const result = buildCsvString(['A'], [['line1\nline2']])
    const lines = result.split('\n')
    expect(lines[1]).toBe('"line1')
  })

  it('CSV injection 방어 — 수식 문자는 sanitize', () => {
    const result = buildCsvString(['A'], [['=CMD()']])
    const lines = result.split('\n')
    expect(lines[1]).toBe("'=CMD()")
  })

  it('숫자는 sanitize하지 않음', () => {
    const result = buildCsvString(['A'], [[-100]])
    const lines = result.split('\n')
    expect(lines[1]).toBe('-100')
  })

  it('빈 데이터 배열', () => {
    const result = buildCsvString(['A', 'B'], [])
    expect(result).toBe('A,B')
  })
})

// --- DOM 의존 함수 테스트 ---

function mockDom() {
  const clickFn = vi.fn()
  vi.spyOn(document, 'createElement').mockReturnValue({
    href: '',
    download: '',
    click: clickFn,
  } as unknown as HTMLAnchorElement)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  return { clickFn }
}

describe('downloadCsv', () => {
  it('a 태그를 생성하고 click 호출', () => {
    const { clickFn } = mockDom()
    downloadCsv('test', ['A'], [['B']])
    expect(clickFn).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })
})

describe('exportCsv', () => {
  it('컬럼 정의 기반으로 downloadCsv 호출', () => {
    const { clickFn } = mockDom()

    type Item = { name: string; qty: number }
    const columns: CsvColumn<Item>[] = [
      { header: '품목명', accessor: (r) => r.name },
      { header: '수량', accessor: (r) => r.qty },
    ]

    exportCsv('items', columns, [
      { name: '사과', qty: 100 },
      { name: '배', qty: 200 },
    ])

    expect(clickFn).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })
})
