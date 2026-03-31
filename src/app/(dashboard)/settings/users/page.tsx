import type { Metadata } from 'next'
import UsersSettingsContent from './_content'

export const metadata: Metadata = {
  title: '사용자 관리',
  description: '회사 사용자 목록 및 역할 관리',
}

export default function UsersSettingsPage() {
  return <UsersSettingsContent />
}
