import type { Metadata } from 'next'
import InventoryContent from './_content'

export const metadata: Metadata = {
  title: '재고 현황',
  description: '품목별/창고별 재고 현황 및 로트 조회',
}

export default function InventoryPage() {
  return <InventoryContent />
}
