'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/page-header'
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
import { SearchInput } from '@/components/common/search-input'
import { extractErrorMessage } from '@/lib/api/error'
import { formatDate } from '@/lib/format'
import { UserPlus } from 'lucide-react'

type CompanyUser = {
  id: string
  email: string
  display_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

const roleLabels: Record<string, string> = {
  company_admin: '회사 관리자',
  normal: '일반',
  pending: '승인 대기',
}

const roleBadgeStyles: Record<string, string> = {
  company_admin: 'border-info text-info',
  normal: 'border-text-secondary text-text-secondary',
  pending: 'border-warning text-warning bg-warning/10',
}

const roleItems: Record<string, string> = {
  company_admin: '회사 관리자',
  normal: '일반',
}

export default function UsersSettingsContent() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  // 초대 다이얼로그
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('normal')

  // 역할 수정 다이얼로그
  const [editOpen, setEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null)
  const [editRole, setEditRole] = useState('')

  // 현재 사용자 프로필
  const { data: profile } = useQuery({
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
        id: user.id,
        displayName: data.display_name || data.email,
        email: data.email,
        role: data.role,
        company_id: data.company_id,
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const isAdmin = profile?.role === 'company_admin'

  // 같은 회사 사용자 목록
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['settings', 'users', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, role, is_active, created_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as CompanyUser[]
    },
    enabled: !!profile?.company_id,
    placeholderData: (prev) => prev,
  })

  // 검색 필터
  const filteredUsers = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.email.toLowerCase().includes(q)
      || u.display_name?.toLowerCase().includes(q)
  })

  // 사용자 초대
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteName,
          password: invitePassword,
          role: inviteRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '초대에 실패했습니다')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'users'] })
      closeInviteDialog()
    },
  })

  // 역할 변경
  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return
      const { error } = await supabase
        .from('profiles')
        .update({ role: editRole })
        .eq('id', editingUser.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'users'] })
      qc.invalidateQueries({ queryKey: ['profile', 'me'] })
      setEditOpen(false)
      setEditingUser(null)
    },
  })

  // 활성/비활성 토글
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'users'] })
    },
  })

  const closeInviteDialog = () => {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteName('')
    setInvitePassword('')
    setInviteRole('normal')
  }

  const openEdit = (user: CompanyUser) => {
    setEditingUser(user)
    setEditRole(user.role === 'pending' ? 'normal' : user.role)
    setEditOpen(true)
  }

  const pendingCount = users.filter((u) => u.role === 'pending').length

  return (
    <div className="space-y-6">
      <PageHeader title="사용자 관리" description="회사 소속 사용자를 관리합니다.">
        {isAdmin && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="h-9 bg-primary hover:bg-primary-hover text-white text-[14px]"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            사용자 초대
          </Button>
        )}
      </PageHeader>

      {/* 검색 + 승인 대기 알림 */}
      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="이메일 또는 이름으로 검색..."
        />
        {pendingCount > 0 && (
          <Badge
            variant="outline"
            className="text-[12px] rounded-sm border-[1.5px] border-warning text-warning bg-warning/10 px-2.5 py-1"
          >
            승인 대기 {pendingCount}명
          </Badge>
        )}
      </div>

      {/* 사용자 테이블 */}
      {isLoading ? (
        <p className="text-[14px] text-muted-foreground">불러오는 중...</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>가입일</TableHead>
                {isAdmin && <TableHead className="w-[140px]">작업</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-[14px] text-muted-foreground py-8">
                    {search ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className={`h-[36px] ${user.role === 'pending' ? 'border-l-[3px] border-l-warning' : ''}`}
                  >
                    <TableCell className="text-foreground font-medium">
                      {user.display_name || '-'}
                      {user.id === profile?.id && (
                        <span className="text-[11px] text-muted-foreground ml-1.5">(나)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[12px] rounded-sm border-[1.5px] ${
                          roleBadgeStyles[user.role] || roleBadgeStyles.normal
                        }`}
                      >
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[12px] rounded-sm border-[1.5px] ${
                          user.is_active
                            ? 'border-secondary text-secondary'
                            : 'border-text-disabled text-text-muted'
                        }`}
                      >
                        {user.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary text-[13px]">
                      {formatDate(user.created_at)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {user.id !== profile?.id && (
                          <div className="flex gap-1">
                            {user.role === 'pending' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(user)}
                                className="h-7 text-[12px] text-warning hover:text-warning font-medium"
                              >
                                승인
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(user)}
                                  className="h-7 text-[12px] text-text-secondary hover:text-foreground"
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
                                      ? 'text-destructive hover:text-destructive'
                                      : 'text-secondary hover:text-secondary'
                                  }`}
                                >
                                  {user.is_active ? '비활성화' : '활성화'}
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!isAdmin && (
        <p className="text-[12px] text-muted-foreground">
          회사 관리자만 사용자를 초대하거나 역할을 변경할 수 있습니다.
        </p>
      )}

      {/* 사용자 초대 다이얼로그 */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-[20px] font-semibold tracking-[-0.01em]">
              사용자 초대
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate() }} className="space-y-4">
            {inviteMutation.error && (
              <div className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {extractErrorMessage(inviteMutation.error)}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                이름 <span className="text-destructive">*</span>
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
                이메일 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-9 text-[14px]"
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">
                초기 비밀번호 <span className="text-destructive">*</span>
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">역할</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => { if (v) setInviteRole(v) }}
                items={roleItems}
              >
                <SelectTrigger className="h-9 text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">일반</SelectItem>
                  <SelectItem value="company_admin">회사 관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeInviteDialog}
                className="h-9 text-[14px] border-border"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="h-9 bg-primary hover:bg-primary-hover text-white text-[14px]"
              >
                {inviteMutation.isPending ? '생성 중...' : '초대'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 역할 수정 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-[20px] font-semibold tracking-[-0.01em]">
              {editingUser?.role === 'pending' ? '사용자 승인' : '역할 변경'}
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={(e) => { e.preventDefault(); updateRoleMutation.mutate() }} className="space-y-4">
              {updateRoleMutation.error && (
                <div className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {extractErrorMessage(updateRoleMutation.error)}
                </div>
              )}

              <div className="text-[14px] text-text-secondary">
                <span className="font-medium text-foreground">{editingUser.display_name || '-'}</span>
                {' '}({editingUser.email})
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">역할</Label>
                <Select
                  value={editRole}
                  onValueChange={(v) => { if (v) setEditRole(v) }}
                  items={roleItems}
                >
                  <SelectTrigger className="h-9 text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">일반</SelectItem>
                    <SelectItem value="company_admin">회사 관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  className="h-9 text-[14px] border-border"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="h-9 bg-primary hover:bg-primary-hover text-white text-[14px]"
                >
                  {updateRoleMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
