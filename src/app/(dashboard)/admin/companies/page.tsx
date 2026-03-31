'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

type CompanyAdmin = {
  id: string
  email: string
  display_name: string | null
  role: string
  is_active: boolean
}

export default function AdminCompaniesPage() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  // 관리자 추가 다이얼로그 상태
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteCompany, setInviteCompany] = useState<Company | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')

  // 관리자 목록 다이얼로그 상태
  const [adminsDialogOpen, setAdminsDialogOpen] = useState(false)
  const [adminsCompany, setAdminsCompany] = useState<Company | null>(null)

  // 폼 상태
  const [name, setName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Company[]
    },
  })

  // 선택된 회사의 관리자 목록 조회
  const { data: companyAdmins = [], isLoading: adminsLoading } = useQuery({
    queryKey: ['admin', 'company-admins', adminsCompany?.id],
    queryFn: async () => {
      if (!adminsCompany) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, role, is_active')
        .eq('company_id', adminsCompany.id)
        .in('role', ['company_admin', 'normal'])
        .order('role')
      if (error) throw error
      return data as CompanyAdmin[]
    },
    enabled: !!adminsCompany,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('admin_create_company', {
        p_name: name,
        p_business_number: businessNumber || undefined,
        p_address: address || undefined,
        p_phone: phone || undefined,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'companies'] })
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return
      const { error } = await supabase
        .from('companies')
        .update({
          name,
          business_number: businessNumber || null,
          address: address || null,
          phone: phone || null,
        })
        .eq('id', editing.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'companies'] })
      closeDialog()
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'companies'] })
    },
  })

  // 관리자 초대 mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteCompany) return
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteName,
          companyId: inviteCompany.id,
          password: invitePassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '초대 실패')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'company-admins'] })
      closeInviteDialog()
    },
  })

  const openCreate = () => {
    setEditing(null)
    setName('')
    setBusinessNumber('')
    setAddress('')
    setPhone('')
    setDialogOpen(true)
  }

  const openEdit = (company: Company) => {
    setEditing(company)
    setName(company.name)
    setBusinessNumber(company.business_number || '')
    setAddress(company.address || '')
    setPhone(company.phone || '')
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const openInvite = (company: Company) => {
    setInviteCompany(company)
    setInviteEmail('')
    setInviteName('')
    setInvitePassword('')
    setInviteDialogOpen(true)
  }

  const closeInviteDialog = () => {
    setInviteDialogOpen(false)
    setInviteCompany(null)
  }

  const openAdmins = (company: Company) => {
    setAdminsCompany(company)
    setAdminsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMutation.mutate()
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const roleLabels: Record<string, string> = {
    company_admin: '회사관리자',
    normal: '일반',
  }

  const roleBadgeStyles: Record<string, string> = {
    company_admin: 'border-[#4A7B94] text-[#4A7B94]',
    normal: 'border-[#6B6158] text-[#6B6158]',
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-[#1A1714]">
            회사 관리
          </h1>
          <p className="text-[14px] text-[#6B6158] mt-1">
            등록된 회사를 관리하고 회사 관리자를 추가합니다.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-9 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[14px]"
        >
          회사 추가
        </Button>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <p className="text-[14px] text-[#9C9189]">불러오는 중...</p>
      ) : (
        <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F0EB]/50">
                <TableHead className="text-[13px] font-medium text-[#6B6158]">회사명</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">사업자번호</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">연락처</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">원가방식</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">상태</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">초대 코드</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158] w-[200px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[14px] text-[#9C9189] py-8">
                    등록된 회사가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="h-[36px]">
                    <TableCell className="text-[13px] text-[#1A1714] font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#6B6158]">
                      {company.business_number || '-'}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#6B6158]">
                      {company.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="font-data text-[13px] text-[#1A1714]">
                        {company.costing_method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[12px] rounded-[3px] border-[1.5px] ${
                          company.is_active
                            ? 'border-[#2B7A6F] text-[#2B7A6F]'
                            : 'border-[#C4BBB2] text-[#C4BBB2]'
                        }`}
                      >
                        {company.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="font-data text-[11px] text-[#9C9189] bg-[#F5F0EB] px-1.5 py-0.5 rounded">
                        {company.id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdmins(company)}
                          className="h-7 text-[12px] text-[#4A7B94] hover:text-[#4A7B94]"
                        >
                          사용자
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(company)}
                          className="h-7 text-[12px] text-[#6B6158] hover:text-[#1A1714]"
                        >
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({
                            id: company.id,
                            isActive: company.is_active,
                          })}
                          className={`h-7 text-[12px] ${
                            company.is_active
                              ? 'text-[#B83A2A] hover:text-[#B83A2A]'
                              : 'text-[#2B7A6F] hover:text-[#2B7A6F]'
                          }`}
                        >
                          {company.is_active ? '비활성화' : '활성화'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 회사 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-[#E0D8CF]">
          <DialogHeader>
            <DialogTitle className="font-heading text-[20px] font-semibold tracking-[-0.01em]">
              {editing ? '회사 수정' : '회사 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(createMutation.error || updateMutation.error) && (
              <div className="text-[13px] text-[#B83A2A] bg-[#B83A2A]/10 border border-[#B83A2A]/20 rounded-[6px] px-3 py-2">
                {(createMutation.error || updateMutation.error)?.message}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                회사명 <span className="text-[#B83A2A]">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-[14px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                사업자등록번호
              </Label>
              <Input
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="000-00-00000"
                className="h-9 text-[14px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">주소</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-9 text-[14px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">연락처</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-[14px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                className="h-9 text-[14px] border-[#E0D8CF]"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-9 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[14px]"
              >
                {isSaving ? '저장 중...' : editing ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 회사 사용자 목록 다이얼로그 */}
      <Dialog open={adminsDialogOpen} onOpenChange={setAdminsDialogOpen}>
        <DialogContent className="bg-white border-[#E0D8CF] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-[20px] font-semibold tracking-[-0.01em]">
              {adminsCompany?.name} — 사용자
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => adminsCompany && openInvite(adminsCompany)}
                className="h-8 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[13px]"
              >
                관리자 추가
              </Button>
            </div>

            {adminsLoading ? (
              <p className="text-[14px] text-[#9C9189]">불러오는 중...</p>
            ) : companyAdmins.length === 0 ? (
              <p className="text-center text-[14px] text-[#9C9189] py-4">
                등록된 사용자가 없습니다.
              </p>
            ) : (
              <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F5F0EB]/50">
                      <TableHead className="text-[13px] font-medium text-[#6B6158]">이름</TableHead>
                      <TableHead className="text-[13px] font-medium text-[#6B6158]">이메일</TableHead>
                      <TableHead className="text-[13px] font-medium text-[#6B6158]">역할</TableHead>
                      <TableHead className="text-[13px] font-medium text-[#6B6158]">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyAdmins.map((admin) => (
                      <TableRow key={admin.id} className="h-[36px]">
                        <TableCell className="text-[13px] text-[#1A1714] font-medium">
                          {admin.display_name || '-'}
                        </TableCell>
                        <TableCell className="text-[13px] text-[#6B6158]">
                          {admin.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[12px] rounded-[3px] border-[1.5px] ${
                              roleBadgeStyles[admin.role] || roleBadgeStyles.normal
                            }`}
                          >
                            {roleLabels[admin.role] || admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[12px] rounded-[3px] border-[1.5px] ${
                              admin.is_active
                                ? 'border-[#2B7A6F] text-[#2B7A6F]'
                                : 'border-[#C4BBB2] text-[#C4BBB2]'
                            }`}
                          >
                            {admin.is_active ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 관리자 초대 다이얼로그 */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="bg-white border-[#E0D8CF]">
          <DialogHeader>
            <DialogTitle className="font-heading text-[20px] font-semibold tracking-[-0.01em]">
              관리자 추가 — {inviteCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {inviteMutation.error && (
              <div className="text-[13px] text-[#B83A2A] bg-[#B83A2A]/10 border border-[#B83A2A]/20 rounded-[6px] px-3 py-2">
                {inviteMutation.error.message}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                이름 <span className="text-[#B83A2A]">*</span>
              </Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
                className="h-9 text-[14px]"
                placeholder="홍길동"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                이메일 <span className="text-[#B83A2A]">*</span>
              </Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-9 text-[14px]"
                placeholder="admin@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                초기 비밀번호 <span className="text-[#B83A2A]">*</span>
              </Label>
              <Input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={6}
                className="h-9 text-[14px]"
                placeholder="6자 이상"
              />
              <p className="text-[12px] text-[#9C9189]">
                회사 관리자(company_admin) 역할로 생성됩니다.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeInviteDialog}
                className="h-9 text-[14px] border-[#E0D8CF]"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="h-9 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[14px]"
              >
                {inviteMutation.isPending ? '생성 중...' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
