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

export default function AdminCompaniesPage() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('companies').insert({
        name,
        business_number: businessNumber || null,
        address: address || null,
        phone: phone || null,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-[#1A1714]">
            회사 관리
          </h1>
          <p className="text-[14px] text-[#6B6158] mt-1">
            등록된 회사를 관리합니다. 초대 코드는 회사 ID입니다.
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
                <TableHead className="text-[13px] font-medium text-[#6B6158] w-[120px]">작업</TableHead>
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

      {/* 생성/수정 다이얼로그 */}
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
    </div>
  )
}
