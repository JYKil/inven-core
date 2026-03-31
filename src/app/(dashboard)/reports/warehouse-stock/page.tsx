import type { Metadata } from 'next'
import WarehouseStockContent from './_content'

export const metadata: Metadata = {
  title: '창고별 재고',
  description: '창고별 재고 현황 보고서',
}

export default function WarehouseStockPage() {
  return <WarehouseStockContent />
}
