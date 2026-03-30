'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'choose' | 'create' | 'join'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('choose')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 회사 생성 폼
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')

  // 초대 코드 (향후 확장)
  const [inviteCode, setInviteCode] = useState('')

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 정보를 찾을 수 없습니다.')

      // 회사 생성
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          business_number: businessNumber || null,
        })
        .select()
        .single()

      if (companyError) throw companyError

      // 프로필 생성 (company_admin)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          company_id: company.id,
          role: 'company_admin',
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
          email: user.email!,
        })

      if (profileError) throw profileError

      // JWT 갱신 (custom claims hook 반영)
      await supabase.auth.refreshSession()

      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 초대 코드로 회사 조회
      const { data: company, error: findError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', inviteCode)
        .eq('is_active', true)
        .single()

      if (findError || !company) {
        setError('유효하지 않은 초대 코드입니다.')
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 정보를 찾을 수 없습니다.')

      // 프로필 생성 (normal)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          company_id: company.id,
          role: 'normal',
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
          email: user.email!,
        })

      if (profileError) throw profileError

      await supabase.auth.refreshSession()

      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setLoading(false)
    }
  }

  // 선택 화면
  if (step === 'choose') {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-[#1A1714]">
          시작하기
        </h2>
        <p className="text-[14px] text-[#6B6158]">
          회사를 새로 만들거나, 초대 코드로 기존 회사에 참여하세요.
        </p>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => setStep('create')}
            className="w-full text-left border border-[#E0D8CF] rounded-[8px] p-4 hover:border-[#D4642A] hover:bg-[#D4642A]/5 transition-colors duration-[80ms]"
          >
            <div className="text-[14px] font-medium text-[#1A1714]">
              새 회사 만들기
            </div>
            <div className="text-[13px] text-[#6B6158] mt-0.5">
              회사 관리자로 시작합니다
            </div>
          </button>

          <button
            onClick={() => setStep('join')}
            className="w-full text-left border border-[#E0D8CF] rounded-[8px] p-4 hover:border-[#D4642A] hover:bg-[#D4642A]/5 transition-colors duration-[80ms]"
          >
            <div className="text-[14px] font-medium text-[#1A1714]">
              초대 코드로 참여
            </div>
            <div className="text-[13px] text-[#6B6158] mt-0.5">
              기존 회사의 멤버로 참여합니다
            </div>
          </button>
        </div>
      </div>
    )
  }

  // 회사 생성 화면
  if (step === 'create') {
    return (
      <form onSubmit={handleCreateCompany} className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep('choose')}
            className="text-[#6B6158] hover:text-[#1A1714] text-[14px]"
          >
            ←
          </button>
          <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-[#1A1714]">
            새 회사 만들기
          </h2>
        </div>

        {error && (
          <div className="text-[13px] text-[#B83A2A] bg-[#B83A2A]/10 border border-[#B83A2A]/20 rounded-[6px] px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-[13px] text-[#1A1714]">
              회사명 <span className="text-[#B83A2A]">*</span>
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="예: (주)인벤코어"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              autoFocus
              className="h-9 text-[14px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessNumber" className="text-[13px] text-[#1A1714]">
              사업자등록번호 <span className="text-[12px] text-[#9C9189]">(선택)</span>
            </Label>
            <Input
              id="businessNumber"
              type="text"
              placeholder="000-00-00000"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              className="h-9 text-[14px]"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-9 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[14px] font-medium"
        >
          {loading ? '생성 중...' : '회사 만들기'}
        </Button>
      </form>
    )
  }

  // 초대 코드 입력 화면
  return (
    <form onSubmit={handleJoinCompany} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep('choose')}
          className="text-[#6B6158] hover:text-[#1A1714] text-[14px]"
        >
          ←
        </button>
        <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-[#1A1714]">
          초대 코드로 참여
        </h2>
      </div>

      {error && (
        <div className="text-[13px] text-[#B83A2A] bg-[#B83A2A]/10 border border-[#B83A2A]/20 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="inviteCode" className="text-[13px] text-[#1A1714]">
          초대 코드
        </Label>
        <Input
          id="inviteCode"
          type="text"
          placeholder="관리자에게 받은 코드를 입력하세요"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
          autoFocus
          className="h-9 text-[14px]"
        />
        <p className="text-[12px] text-[#9C9189]">
          회사 관리자에게 초대 코드를 요청하세요.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-9 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[14px] font-medium"
      >
        {loading ? '참여 중...' : '참여하기'}
      </Button>
    </form>
  )
}
