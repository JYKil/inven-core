import type { Metadata } from 'next'
import ReferenceCodesContent from './_content'

export const metadata: Metadata = {
  title: '기준정보',
  description: '기준정보 코드 관리',
}

export default function ReferenceCodesPage() {
  return <ReferenceCodesContent />
}
