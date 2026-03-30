'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const roleLabels: Record<string, string> = {
  super_admin: '최고 관리자',
  company_admin: '회사 관리자',
  normal: '일반 사용자',
}

export function TopBar() {
  const router = useRouter()
  const [profile, setProfile] = useState<{
    displayName: string
    email: string
    role: string
  } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('display_name, email, role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile({
              displayName: data.display_name || data.email,
              email: data.email,
              role: data.role,
            })
          }
        })
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-12 flex items-center gap-2 border-b border-border bg-surface px-4 shrink-0">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex-1" />
      {profile && (
        <Popover>
          <PopoverTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none">
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
