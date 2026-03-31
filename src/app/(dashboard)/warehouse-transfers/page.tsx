import type { Metadata } from 'next'
import WarehouseTransfersContent from './_content'

export const metadata: Metadata = {
  title: '창고 이동',
  description: '창고 간 재고 이동 관리',
}

export default function WarehouseTransfersPage() {
  return <WarehouseTransfersContent />
}
