// CSV 내보내기 유틸리티

// 컬럼 정의 기반 내보내기 — 보고서에서 사용
export type CsvColumn<T> = {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

export function exportCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]) {
  downloadCsv(
    filename,
    columns.map((c) => c.header),
    data.map((row) => columns.map((c) => c.accessor(row))),
  )
}

// [C3] CSV formula injection 방어 — 수식 문자로 시작하는 셀 앞에 작은따옴표 추가
function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`
  }
  return value
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const bom = '\uFEFF' // UTF-8 BOM (엑셀 한글 깨짐 방지)
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        if (cell == null) return ''
        const str = typeof cell === 'number' ? String(cell) : sanitizeCsvCell(String(cell))
        // 쉼표, 줄바꿈, 큰따옴표가 포함된 경우 이스케이프
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    ),
  ].join('\n')

  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  // [I9] 다운로드 시작 후 해제 — 일부 브라우저에서 즉시 해제 시 실패 방지
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
