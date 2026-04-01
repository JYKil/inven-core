import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Defence in depth: 미들웨어 실패 시에도 인증 보장
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 사이드바 쿠키 읽어서 SSR/CSR 상태 일치 (hydration mismatch 방지)
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')?.value
  const defaultOpen = sidebarCookie !== undefined ? sidebarCookie === 'true' : true

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 px-6 py-12">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
