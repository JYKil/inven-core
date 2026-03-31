import type { Metadata } from 'next'
import AssemblyOrdersContent from './_content'

export const metadata: Metadata = {
  title: '조립 관리',
  description: 'BOM 기반 조립 작업 관리',
}

export default function AssemblyOrdersPage() {
  return <AssemblyOrdersContent />
}
