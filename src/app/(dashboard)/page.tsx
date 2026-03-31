import type { Metadata } from 'next'
import DashboardContent from './_content'

export const metadata: Metadata = {
  title: '대시보드',
  description: '재고수불관리 대시보드 — 재발주 알림, 처리 대기, 매입/매출 요약',
}

export default function DashboardPage() {
  return <DashboardContent />
}
