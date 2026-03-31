import type { Metadata } from 'next'
import SettingsContent from './_content'

export const metadata: Metadata = {
  title: '설정',
  description: '회사 설정 및 관리',
}

export default function SettingsPage() {
  return <SettingsContent />
}
