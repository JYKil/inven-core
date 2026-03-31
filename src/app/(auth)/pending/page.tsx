'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(false)

  // 승인 여부 확인 (JWT 갱신 후 role 체크)
  const handleCheckApproval = async () => {
    setChecking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      // 프로필 role 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile && profile.role !== 'pending') {
        // 승인됨 → 대시보드로
        await supabase.auth.refreshSession()
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
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="space-y-4 text-center">
      <Clock className="h-8 w-8 text-[#C4901A] mx-auto" />
      <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-[#1A1714]">
        승인 대기 중
      </h2>
      <p className="text-[14px] text-[#6B6158] leading-relaxed">
        관리자가 가입 요청을 확인하고 있습니다.
        <br />
        승인이 완료되면 시스템을 사용할 수 있습니다.
      </p>

      <div className="space-y-2 pt-2">
        <Button
          onClick={handleCheckApproval}
          disabled={checking}
          className="w-full h-9 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[14px] font-medium"
        >
          {checking ? '확인 중...' : '승인 확인'}
        </Button>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-9 text-[14px] border-[#E0D8CF] text-[#6B6158] hover:text-[#1A1714]"
        >
          로그아웃
        </Button>
      </div>
    </div>
  )
}
