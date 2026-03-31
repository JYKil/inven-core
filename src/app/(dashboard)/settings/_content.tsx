'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { extractErrorMessage } from '@/lib/api/error'
import { Save, Building2 } from 'lucide-react'

type Company = {
  id: string
  name: string
  business_number: string | null
  address: string | null
  phone: string | null
  costing_method: string
  is_active: boolean
  created_at: string
}

const costingMethodLabels: Record<string, string> = {
  FIFO: '선입선출 (FIFO)',
  LIFO: '후입선출 (LIFO)',
  WEIGHTED_AVG: '가중평균',
}

export default function SettingsContent() {
  const supabase = createClient()
  const qc = useQueryClient()

  // 현재 사용자의 프로필 (역할 + company_id)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from('profiles')
        .select('display_name, email, role, company_id')
        .eq('id', user.id)
        .single()
      if (!data) return null
      return {
        displayName: data.display_name || data.email,
        email: data.email,
        role: data.role,
        company_id: data.company_id,
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const isAdmin = profile?.role === 'company_admin'

  // 회사 정보 조회
  const { data: company, isLoading } = useQuery({
    queryKey: ['settings', 'company', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()
      if (error) throw error
      return data as Company
    },
    enabled: !!profile?.company_id,
  })

  // 폼 상태
  const [name, setName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  // 회사 데이터 로드 시 폼 채우기
  useEffect(() => {
    if (company) {
      setName(company.name)
      setBusinessNumber(company.business_number || '')
      setAddress(company.address || '')
      setPhone(company.phone || '')
    }
  }, [company])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!company) return
      const { error } = await supabase
        .from('companies')
        .update({
          name,
          business_number: businessNumber || null,
          address: address || null,
          phone: phone || null,
        })
        .eq('id', company.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'company'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  // 변경 사항이 있는지 확인
  const hasChanges = company && (
    name !== company.name ||
    (businessNumber || '') !== (company.business_number || '') ||
    (address || '') !== (company.address || '') ||
    (phone || '') !== (company.phone || '')
  )

  if (isLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="회사 설정" description="회사 기본 정보를 관리합니다." />
        <p className="text-[14px] text-muted-foreground">불러오는 중...</p>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <PageHeader title="회사 설정" description="회사 기본 정보를 관리합니다." />
        <p className="text-[14px] text-muted-foreground">회사 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="회사 설정" description="회사 기본 정보를 관리합니다." />

      <div className="max-w-2xl space-y-6">
        {/* 회사 정보 카드 */}
        <div className="border border-border rounded-lg bg-card">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              기본 정보
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {updateMutation.error && (
              <div className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {extractErrorMessage(updateMutation.error)}
              </div>
            )}
            {updateMutation.isSuccess && (
              <div className="text-[13px] text-secondary bg-secondary/10 border border-secondary/20 rounded-md px-3 py-2">
                저장되었습니다.
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                회사명 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!isAdmin}
                className="h-9 text-[14px] max-w-md"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">사업자등록번호</Label>
              <Input
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="000-00-00000"
                disabled={!isAdmin}
                className="h-9 text-[14px] max-w-md"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">주소</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isAdmin}
                className="h-9 text-[14px] max-w-md"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">연락처</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isAdmin}
                className="h-9 text-[14px] max-w-md"
              />
            </div>

            {isAdmin && (
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !hasChanges}
                  className="h-9 bg-primary hover:bg-primary-hover text-white text-[14px]"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}

            {!isAdmin && (
              <p className="text-[12px] text-muted-foreground pt-1">
                회사 관리자만 정보를 수정할 수 있습니다.
              </p>
            )}
          </form>
        </div>

        {/* 원가 계산 방식 (읽기 전용) */}
        <div className="border border-border rounded-lg bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              원가 계산 방식
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="text-[13px] rounded-sm border-[1.5px] border-primary text-primary px-3 py-1"
              >
                {costingMethodLabels[company.costing_method] || company.costing_method}
              </Badge>
              <span className="text-[13px] text-muted-foreground">
                현재 적용 중인 원가 계산 방식입니다.
              </span>
            </div>
          </div>
        </div>

        {/* 초대 코드 */}
        <div className="border border-border rounded-lg bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              초대 코드
            </h2>
          </div>
          <div className="p-6 space-y-2">
            <p className="text-[13px] text-muted-foreground">
              아래 코드를 새 사용자에게 전달하면, 회원가입 시 이 회사에 소속됩니다.
            </p>
            <code className="block font-data text-[14px] text-foreground bg-muted px-4 py-2.5 rounded-md select-all">
              {company.id}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
