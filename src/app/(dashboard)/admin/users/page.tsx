'use client'

import { useState, useMemo } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Profile = {
  id: string
  email: string
  display_name: string | null
  role: string
  company_id: string | null
  is_active: boolean
  created_at: string
  companies: { id: string; name: string } | null
}

type Company = {
  id: string
  name: string
}

const roleLabels: Record<string, string> = {
  super_admin: '슈퍼관리자',
  company_admin: '회사관리자',
  normal: '일반',
  pending: '승인대기',
}

const roleBadgeStyles: Record<string, string> = {
  super_admin: 'border-[#D4642A] text-[#D4642A]',
  company_admin: 'border-[#4A7B94] text-[#4A7B94]',
  normal: 'border-[#6B6158] text-[#6B6158]',
  pending: 'border-[#C4901A] text-[#C4901A] bg-[#C4901A]/10',
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterPending, setFilterPending] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)

  // 편집 폼 상태
  const [editRole, setEditRole] = useState('')
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(id, name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['admin', 'companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Company[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return

      const updates: Record<string, unknown> = { role: editRole }

      // super_admin은 company_id NULL, 나머지는 필수
      if (editRole === 'super_admin') {
        updates.company_id = null
      } else {
        updates.company_id = editCompanyId
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingUser.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setDialogOpen(false)
      setEditingUser(null)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const companyItemsMap = useMemo(() => {
    const map: Record<string, string> = {}
    companies.forEach((c) => { map[c.id] = c.name })
    return map
  }, [companies])

  const openEdit = (user: Profile) => {
    setEditingUser(user)
    // pending 사용자는 기본 역할을 normal로 설정
    setEditRole(user.role === 'pending' ? 'normal' : user.role)
    setEditCompanyId(user.company_id)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editRole !== 'super_admin' && !editCompanyId) return
    updateMutation.mutate()
  }

  // pending 사용자 수
  const pendingCount = users.filter((u) => u.role === 'pending').length

  // 검색 + 필터
  const filteredUsers = users.filter((u) => {
    if (filterPending && u.role !== 'pending') return false
    if (search) {
      const q = search.toLowerCase()
      return u.email.toLowerCase().includes(q)
        || u.display_name?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-[#1A1714]">
          전체 사용자 관리
        </h1>
        <p className="text-[14px] text-[#6B6158] mt-1">
          모든 회사의 사용자를 조회하고 역할/회사를 변경합니다.
        </p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="이메일 또는 이름으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm h-9 text-[14px]"
        />
        {pendingCount > 0 && (
          <Button
            variant={filterPending ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterPending(!filterPending)}
            className={filterPending
              ? 'h-9 bg-[#C4901A] hover:bg-[#C4901A]/90 text-white text-[13px]'
              : 'h-9 border-[#C4901A] text-[#C4901A] hover:bg-[#C4901A]/10 text-[13px]'
            }
          >
            승인대기 {pendingCount}명
          </Button>
        )}
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <p className="text-[14px] text-[#9C9189]">불러오는 중...</p>
      ) : (
        <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F0EB]/50">
                <TableHead className="text-[13px] font-medium text-[#6B6158]">이름</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">이메일</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">역할</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">소속 회사</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158]">상태</TableHead>
                <TableHead className="text-[13px] font-medium text-[#6B6158] w-[120px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[14px] text-[#9C9189] py-8">
                    {search ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className={`h-[36px] ${user.role === 'pending' ? 'border-l-[3px] border-l-[#C4901A]' : ''}`}>
                    <TableCell className="text-[13px] text-[#1A1714] font-medium">
                      {user.display_name || '-'}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#6B6158]">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[12px] rounded-[3px] border-[1.5px] ${
                          roleBadgeStyles[user.role] || roleBadgeStyles.normal
                        }`}
                      >
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] text-[#6B6158]">
                      {user.companies?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[12px] rounded-[3px] border-[1.5px] ${
                          user.is_active
                            ? 'border-[#2B7A6F] text-[#2B7A6F]'
                            : 'border-[#C4BBB2] text-[#C4BBB2]'
                        }`}
                      >
                        {user.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.role === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(user)}
                            className="h-7 text-[12px] text-[#C4901A] hover:text-[#C4901A] font-medium"
                          >
                            승인
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(user)}
                              className="h-7 text-[12px] text-[#6B6158] hover:text-[#1A1714]"
                            >
                              수정
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActiveMutation.mutate({
                                id: user.id,
                                isActive: user.is_active,
                              })}
                              className={`h-7 text-[12px] ${
                                user.is_active
                                  ? 'text-[#B83A2A] hover:text-[#B83A2A]'
                                  : 'text-[#2B7A6F] hover:text-[#2B7A6F]'
                              }`}
                            >
                              {user.is_active ? '비활성화' : '활성화'}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 편집 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-[#E0D8CF]">
          <DialogHeader>
            <DialogTitle className="font-heading text-[20px] font-semibold tracking-[-0.01em]">
              {editingUser?.role === 'pending' ? '사용자 승인' : '사용자 수정'}
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {updateMutation.error && (
                <div className="text-[13px] text-[#B83A2A] bg-[#B83A2A]/10 border border-[#B83A2A]/20 rounded-[6px] px-3 py-2">
                  {updateMutation.error.message}
                </div>
              )}

              <div className="text-[14px] text-[#6B6158]">
                <span className="font-medium text-[#1A1714]">{editingUser.display_name}</span>
                {' '}({editingUser.email})
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">역할</Label>
                <Select value={editRole} onValueChange={(v) => { if (v) setEditRole(v) }} items={{ company_admin: '회사관리자', normal: '일반', super_admin: '슈퍼관리자' }}>
                  <SelectTrigger className="h-9 text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_admin">회사관리자</SelectItem>
                    <SelectItem value="normal">일반</SelectItem>
                    <SelectItem value="super_admin">슈퍼관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editRole !== 'super_admin' && (
                <div className="space-y-1.5">
                  <Label className="text-[13px]">
                    소속 회사 <span className="text-[#B83A2A]">*</span>
                  </Label>
                  {!editCompanyId && (
                    <p className="text-[12px] text-[#B83A2A]">회사를 선택해야 저장할 수 있습니다</p>
                  )}
                  <Select
                    value={editCompanyId || ''}
                    onValueChange={(v) => setEditCompanyId(v || null)}
                    items={companyItemsMap}
                  >
                    <SelectTrigger className="h-9 text-[14px]">
                      <SelectValue placeholder="회사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="h-9 text-[14px] border-[#E0D8CF]"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="h-9 bg-[#D4642A] hover:bg-[#BF5520] text-white text-[14px]"
                >
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
