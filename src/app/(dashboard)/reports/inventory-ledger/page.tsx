import type { Metadata } from 'next'
import InventoryLedgerContent from './_content'

export const metadata: Metadata = {
  title: '재고 수불부',
  description: '기간별 재고 수불부 — 기초잔량, 입출고, 기말잔량',
}

export default function InventoryLedgerPage() {
  return <InventoryLedgerContent />
}
