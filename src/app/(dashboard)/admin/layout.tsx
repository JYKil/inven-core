// super_admin 전용 레이아웃 — 권한 가드
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin') {
    redirect('/')
  }

  return <>{children}</>
}
