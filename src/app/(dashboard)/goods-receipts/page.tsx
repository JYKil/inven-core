import type { Metadata } from 'next'
import GoodsReceiptsContent from './_content'

export const metadata: Metadata = {
  title: '입고 관리',
  description: '발주 기반 입고 처리 및 이력 관리',
}

export default function GoodsReceiptsPage() {
  return <GoodsReceiptsContent />
}
