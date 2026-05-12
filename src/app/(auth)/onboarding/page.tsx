'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    await signOut()
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

        if (data.role === 'super_admin') {
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
  }, [router])

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <h2 className="font-heading text-xl font-semibold tracking-[-0.01em] text-foreground">
          등록 오류
        </h2>
        <p className="text-sm text-text-secondary">{error}</p>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-cell text-primary hover:text-primary-hover font-medium"
        >
          로그아웃
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
      <p className="text-sm text-text-secondary">등록 처리 중...</p>
    </div>
  )
}
