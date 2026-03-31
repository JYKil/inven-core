'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { partnerUpdateSchema, type PartnerUpdate } from '@/lib/validations/partner'
import { usePartner, useUpdatePartner, useDeletePartner } from '@/hooks/use-partners'

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const { data: partner, isLoading } = usePartner(id)
  const updatePartner = useUpdatePartner()
  const deletePartner = useDeletePartner()

  const form = useForm<PartnerUpdate>({
    resolver: zodResolver(partnerUpdateSchema),
  })

  // 편집 모드 전환 시 폼 초기화
  const startEdit = () => {
    if (!partner) return
    form.reset({
      name: partner.name,
      partner_type: partner.partner_type as PartnerUpdate['partner_type'],
      business_number: partner.business_number ?? '',
      contact_name: partner.contact_name ?? '',
      phone: partner.phone ?? '',
      email: partner.email ?? '',
      address: partner.address ?? '',
      notes: partner.notes ?? '',
    })
    setEditing(true)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updatePartner.mutateAsync({ id, ...data })
      toast.success('거래처 수정 완료')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    }
  })

  const handleDelete = async () => {
    if (!confirm('이 거래처를 비활성화하시겠습니까?')) return
    try {
      await deletePartner.mutateAsync(id)
      toast.success('거래처 비활성화 완료')
      router.push('/partners')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="거래처 상세" />
        <Card className="border-border max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!partner) {
    return <div className="text-center py-16 text-muted-foreground">거래처를 찾을 수 없습니다</div>
  }

  const partnerTypeLabels: Record<string, string> = {
    supplier: '공급업체', customer: '고객', both: '공급+고객',
  }

  return (
    <div>
      <PageHeader title={editing ? '거래처 수정' : partner.name}>
        {!editing && (
          <>
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              수정
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              비활성화
            </Button>
          </>
        )}
      </PageHeader>

      <Card className="border-border max-w-2xl">
        <CardContent className="pt-6">
          {editing ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>업체명 *</Label>
                  <Input {...form.register('name')} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>유형</Label>
                  <Select
                    value={form.watch('partner_type') ?? 'both'}
                    onValueChange={(v) => v && form.setValue('partner_type', v as PartnerUpdate['partner_type'])}
                    items={{ supplier: '공급업체', customer: '고객', both: '공급+고객' }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">공급업체</SelectItem>
                      <SelectItem value="customer">고객</SelectItem>
                      <SelectItem value="both">공급+고객</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>사업자번호</Label>
                  <Input {...form.register('business_number')} />
                </div>
                <div className="space-y-1.5">
                  <Label>담당자명</Label>
                  <Input {...form.register('contact_name')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>연락처</Label>
                  <Input {...form.register('phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label>이메일</Label>
                  <Input type="email" {...form.register('email')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>주소</Label>
                <Input {...form.register('address')} />
              </div>
              <div className="space-y-1.5">
                <Label>비고</Label>
                <Textarea {...form.register('notes')} rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={updatePartner.isPending} className="bg-primary hover:bg-primary-hover">
                  {updatePartner.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs mb-1">업체명</dt>
                <dd className="font-medium">{partner.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">유형</dt>
                <dd>{partnerTypeLabels[partner.partner_type] ?? partner.partner_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">사업자번호</dt>
                <dd className="font-data">{partner.business_number || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">담당자</dt>
                <dd>{partner.contact_name || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">연락처</dt>
                <dd>{partner.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">이메일</dt>
                <dd>{partner.email || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs mb-1">주소</dt>
                <dd>{partner.address || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs mb-1">비고</dt>
                <dd className="whitespace-pre-wrap">{partner.notes || '-'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
