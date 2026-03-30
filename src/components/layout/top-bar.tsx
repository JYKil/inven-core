'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export function TopBar() {
  return (
    <header className="h-12 flex items-center gap-2 border-b border-border bg-surface px-4 shrink-0">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex-1" />
      {/* 추후: 회사명, 사용자 프로필 드롭다운 */}
    </header>
  )
}
