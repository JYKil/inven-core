import type { Metadata } from 'next'
import VendorsContent from './_content'

export const metadata: Metadata = {
  title: '업체정보',
  description: '공급업체 관리',
}

export default function VendorsPage() {
  return <VendorsContent />
}
