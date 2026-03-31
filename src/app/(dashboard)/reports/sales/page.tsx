import type { Metadata } from 'next'
import SalesReportContent from './_content'

export const metadata: Metadata = {
  title: '매출 보고서',
  description: '매출액, 매출원가, 이익률 보고서',
}

export default function SalesReportPage() {
  return <SalesReportContent />
}
