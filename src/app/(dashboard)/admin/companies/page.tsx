'use client'

import { useState } from 'react'
import { queryDb, rpcDb } from '@/lib/api/db-client'
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
      const { data, error } = await queryDb<Company[]>('companies', [
        { type: 'select', columns: '*' },
        { type: 'order', column: 'created_at', options: { ascending: false } },
      ])
      if (error) throw error
      return data as Company[]
    },
  })

  // 선택된 회사의 관리자 목록 조회
  const { data: companyAdmins = [], isLoading: adminsLoading } = useQuery({
    queryKey: ['admin', 'company-admins', adminsCompany?.id],
    queryFn: async () => {
      if (!adminsCompany) return []
      const { data, error } = await queryDb<CompanyAdmin[]>('profiles', [
        { type: 'select', columns: 'id, email, display_name, role, is_active' },
        { type: 'eq', column: 'company_id', value: adminsCompany.id },
        { type: 'in', column: 'role', values: ['company_admin', 'normal'] },
        { type: 'order', column: 'role' },
      ])
      if (error) throw error
      return data as CompanyAdmin[]
    },
    enabled: !!adminsCompany,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await rpcDb('admin_create_company', {
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
      const { error } = await queryDb('companies', [
        {
          type: 'update',
          values: {
          name,
          business_number: businessNumber || null,
          address: address || null,
          phone: phone || null,
          },
        },
        { type: 'eq', column: 'id', value: editing.id },
      ])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'companies'] })
      closeDialog()
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await queryDb('companies', [
        { type: 'update', values: { is_active: !isActive } },
        { type: 'eq', column: 'id', value: id },
      ])
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
    company_admin: 'border-info text-info',
    normal: 'border-text-secondary text-text-secondary',
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-h1 font-bold tracking-[-0.02em] text-foreground">
            회사 관리
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            등록된 회사를 관리하고 회사 관리자를 추가합니다.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-9 bg-primary hover:bg-primary-hover text-white text-sm"
        >
          회사 추가
        </Button>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>회사명</TableHead>
                <TableHead>사업자번호</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>원가방식</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>초대 코드</TableHead>
                <TableHead className="w-[200px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    등록된 회사가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="h-[36px]">
                    <TableCell className="text-foreground font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {company.business_number || '-'}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {company.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="font-data text-cell text-foreground">
                        {company.costing_method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs rounded-sm border-[1.5px] ${
                          company.is_active
                            ? 'border-secondary text-secondary'
                            : 'border-text-disabled text-text-muted'
                        }`}
                      >
                        {company.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="font-data text-2xs text-muted-foreground bg-background px-1.5 py-0.5 rounded">
                        {company.id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdmins(company)}
                          className="h-7 text-xs text-info hover:text-info"
                        >
                          사용자
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(company)}
                          className="h-7 text-xs text-text-secondary hover:text-foreground"
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
                          className={`h-7 text-xs ${
                            company.is_active
                              ? 'text-destructive hover:text-destructive'
                              : 'text-secondary hover:text-secondary'
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
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-semibold tracking-[-0.01em]">
              {editing ? '회사 수정' : '회사 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(createMutation.error || updateMutation.error) && (
              <div className="text-cell text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {(createMutation.error || updateMutation.error)?.message}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-cell">
                회사명 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-cell">
                사업자등록번호
              </Label>
              <Input
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="000-00-00000"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-cell">주소</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-cell">연락처</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                className="h-9 text-sm border-border"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-9 bg-primary hover:bg-primary-hover text-white text-sm"
              >
                {isSaving ? '저장 중...' : editing ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 회사 사용자 목록 다이얼로그 */}
      <Dialog open={adminsDialogOpen} onOpenChange={setAdminsDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-semibold tracking-[-0.01em]">
              {adminsCompany?.name} — 사용자
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => adminsCompany && openInvite(adminsCompany)}
                className="h-8 bg-primary hover:bg-primary-hover text-white text-cell"
              >
                관리자 추가
              </Button>
            </div>

            {adminsLoading ? (
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            ) : companyAdmins.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                등록된 사용자가 없습니다.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background/50">
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyAdmins.map((admin) => (
                      <TableRow key={admin.id} className="h-[36px]">
                        <TableCell className="text-foreground font-medium">
                          {admin.display_name || '-'}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {admin.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs rounded-sm border-[1.5px] ${
                              roleBadgeStyles[admin.role] || roleBadgeStyles.normal
                            }`}
                          >
                            {roleLabels[admin.role] || admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs rounded-sm border-[1.5px] ${
                              admin.is_active
                                ? 'border-secondary text-secondary'
                                : 'border-text-disabled text-text-muted'
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
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-semibold tracking-[-0.01em]">
              관리자 추가 — {inviteCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {inviteMutation.error && (
              <div className="text-cell text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {inviteMutation.error.message}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-cell">
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
                className="h-9 text-sm"
                placeholder="홍길동"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-cell">
                이메일 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-9 text-sm"
                placeholder="admin@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-cell">
                초기 비밀번호 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={6}
                className="h-9 text-sm"
                placeholder="6자 이상"
              />
              <p className="text-xs text-muted-foreground">
                회사 관리자(company_admin) 역할로 생성됩니다.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeInviteDialog}
                className="h-9 text-sm border-border"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="h-9 bg-primary hover:bg-primary-hover text-white text-sm"
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
