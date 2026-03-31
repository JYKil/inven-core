import type { Metadata } from 'next'
import SalesOrdersContent from './_content'

export const metadata: Metadata = {
  title: '판매 주문',
  description: '판매 주문 관리 및 출고 처리',
}

export default function SalesOrdersPage() {
  return <SalesOrdersContent />
}
