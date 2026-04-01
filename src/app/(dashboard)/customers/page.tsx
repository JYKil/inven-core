import type { Metadata } from 'next'
import CustomersContent from './_content'

export const metadata: Metadata = {
  title: '고객정보',
  description: '고객사 관리',
}

export default function CustomersPage() {
  return <CustomersContent />
}
