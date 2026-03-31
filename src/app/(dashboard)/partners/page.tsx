import type { Metadata } from 'next'
import PartnersContent from './_content'

export const metadata: Metadata = {
  title: '거래처 관리',
  description: '공급사/고객 거래처 관리',
}

export default function PartnersPage() {
  return <PartnersContent />
}
