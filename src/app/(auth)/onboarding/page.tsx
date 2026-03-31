'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  useEffect(() => {
    const registerPending = async () => {
      try {
        const res = await fetch('/api/auth/register-pending', { method: 'POST' })

        if (res.status === 409) {
          router.replace('/pending')
          return
        }

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || '등록에 실패했습니다')
          return
        }

        const data = await res.json()

        // 첫 번째 사용자(super_admin) → JWT 갱신 후 대시보드로
        if (data.role === 'super_admin') {
          await supabase.auth.refreshSession()
          router.replace('/')
          router.refresh()
          return
        }

        router.replace('/pending')
      } catch {
        setError('서버와 통신할 수 없습니다')
      }
    }

    registerPending()
  }, [router, supabase.auth])

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-foreground">
          등록 오류
        </h2>
        <p className="text-[14px] text-text-secondary">{error}</p>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-[13px] text-primary hover:text-primary-hover font-medium"
        >
          로그아웃
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
      <p className="text-[14px] text-text-secondary">등록 처리 중...</p>
    </div>
  )
}
