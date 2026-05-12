'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { User, LogOut, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { signOut } from '@/lib/auth-client'

const roleLabels: Record<string, string> = {
  super_admin: '최고 관리자',
  company_admin: '회사 관리자',
  normal: '일반 사용자',
  pending: '승인 대기',
}

export function TopBar() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { theme, setTheme } = useTheme()
  const { state, isMobile } = useSidebar()
  // 데스크톱에서 사이드바 펼쳐져 있으면 토글 버튼 숨김 (접기는 사이드바 헤더에서)
  const showTrigger = isMobile || state === 'collapsed'

  const { data: profile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (res.status === 401) return null
      if (!res.ok) throw new Error('프로필을 불러오지 못했습니다')
      const { user } = await res.json()
      if (!user) return null
      return {
        displayName: user.name || user.email,
        email: user.email,
        role: user.role,
        company_id: user.companyId,
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  })

  const handleLogout = async () => {
    queryClient.clear() // 캐시 초기화 — 다음 로그인 시 이전 사용자 데이터 방지
    await signOut()
    router.push('/login')
  }

  return (
    <header className="h-12 flex items-center gap-2 border-b border-border bg-card px-4 shrink-0">
      {showTrigger && (
        <>
          <SidebarTrigger className="-ml-1 min-h-[44px] min-w-[44px]" />
          <Separator orientation="vertical" className="h-4" />
        </>
      )}
      <div className="flex-1" />
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        aria-label="테마 전환"
      >
        <Sun className="h-4 w-4 block dark:hidden" />
        <Moon className="h-4 w-4 hidden dark:block" />
      </button>
      {profile && (
        <Popover>
          <PopoverTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none min-h-[44px] px-2">
            <User className="h-4 w-4" />
            <span>{profile.displayName}</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {roleLabels[profile.role] || profile.role}
            </span>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={4} className="w-56 p-2">
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{profile.displayName}</div>
              <div className="text-xs text-muted-foreground">{profile.email}</div>
            </div>
            <div className="h-px bg-border my-1" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </PopoverContent>
        </Popover>
      )}
    </header>
  )
}
