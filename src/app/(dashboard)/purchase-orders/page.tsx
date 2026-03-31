import type { Metadata } from 'next'
import PurchaseOrdersContent from './_content'

export const metadata: Metadata = {
  title: '발주서 관리',
  description: '구매 발주서 작성 및 추적',
}

export default function PurchaseOrdersPage() {
  return <PurchaseOrdersContent />
}
