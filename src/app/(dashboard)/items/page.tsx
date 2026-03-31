import type { Metadata } from 'next'
import ItemsContent from './_content'

export const metadata: Metadata = {
  title: '품목 관리',
  description: '품목 마스터 데이터 관리 — 기초/조립 품목, 재고 현황',
}

export default function ItemsPage() {
  return <ItemsContent />
}
