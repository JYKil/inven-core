'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  const handleCheckApproval = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (res.status === 401) {
        router.replace('/login')
        return
      }
      if (!res.ok) throw new Error('승인 상태를 확인하지 못했습니다')

      const { user } = await res.json()

      if (user.role !== 'pending') {
        router.replace('/')
        router.refresh()
      } else {
        setChecking(false)
      }
    } catch {
      setChecking(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }

  return (
    <div className="space-y-4 text-center">
      <Clock className="h-8 w-8 text-warning mx-auto" />
      <h2 className="font-heading text-xl font-semibold tracking-[-0.01em] text-foreground">
        승인 대기 중
      </h2>
      <p className="text-sm text-text-secondary leading-relaxed">
        관리자가 가입 요청을 확인하고 있습니다.
        <br />
        승인이 완료되면 시스템을 사용할 수 있습니다.
      </p>

      <div className="space-y-2 pt-2">
        <Button
          onClick={handleCheckApproval}
          disabled={checking}
          className="w-full h-9 bg-primary hover:bg-primary-hover text-white text-sm font-medium"
        >
          {checking ? '확인 중...' : '승인 확인'}
        </Button>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-9 text-sm border-border text-text-secondary hover:text-foreground"
        >
          로그아웃
        </Button>
      </div>
    </div>
  )
}
