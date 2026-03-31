import type { Metadata } from 'next'
import WarehousesContent from './_content'

export const metadata: Metadata = {
  title: '창고 관리',
  description: '창고 등록 및 관리',
}

export default function WarehousesPage() {
  return <WarehousesContent />
}
