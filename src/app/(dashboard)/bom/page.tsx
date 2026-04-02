import type { Metadata } from 'next'
import BomContent from './_content'

export const metadata: Metadata = {
  title: 'BOM 관리',
  description: 'BOM(자재명세서) 조회 및 관리',
}

export default function BomPage() {
  return <BomContent />
}
