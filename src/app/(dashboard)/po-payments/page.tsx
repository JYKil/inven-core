import type { Metadata } from 'next'
import PoPaymentsContent from './_content'

export const metadata: Metadata = {
  title: '지급 관리',
  description: '발주 대금 지급 관리',
}

export default function PoPaymentsPage() {
  return <PoPaymentsContent />
}
