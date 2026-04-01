'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { vendorUpdateSchema, type VendorUpdate } from '@/lib/validations/vendor'
import { useVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/use-vendors'

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const { data: vendor, isLoading } = useVendor(id)
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const form = useForm<VendorUpdate>({
    resolver: zodResolver(vendorUpdateSchema),
  })

  const startEdit = () => {
    if (!vendor) return
    form.reset({
      name: vendor.name,
      business_number: vendor.business_number ?? '',
      address: vendor.address ?? '',
      bank_name: vendor.bank_name ?? '',
      bank_code: vendor.bank_code ?? '',
      account_number: vendor.account_number ?? '',
      account_holder: vendor.account_holder ?? '',
      payment_currency: vendor.payment_currency,
      contact_email: vendor.contact_email ?? '',
      notes: vendor.notes ?? '',
    })
    setEditing(true)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateVendor.mutateAsync({ id, ...data })
      toast.success('업체 수정 완료')
      setEditing(false)
    } catch (err) {
      toast.error(extractErrorMessage(err, '수정 실패'))
    }
  })

  const handleDelete = async () => {
    if (!confirm('이 업체를 비활성화하시겠습니까?')) return
    try {
      await deleteVendor.mutateAsync(id)
      toast.success('업체 비활성화 완료')
      router.push('/vendors')
    } catch (err) {
      toast.error(extractErrorMessage(err, '삭제 실패'))
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="업체 상세" />
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

  if (!vendor) {
    return <div className="text-center py-16 text-muted-foreground">업체를 찾을 수 없습니다</div>
  }

  return (
    <div>
      <PageHeader title={editing ? '업체 수정' : vendor.name}>
        {!editing && (
          <>
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1" />수정
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />비활성화
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
                  <Label>사업자번호</Label>
                  <Input {...form.register('business_number')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>주소</Label>
                <Input {...form.register('address')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>은행명</Label>
                  <Input {...form.register('bank_name')} />
                </div>
                <div className="space-y-1.5">
                  <Label>은행코드</Label>
                  <Input {...form.register('bank_code')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>계좌번호</Label>
                  <Input {...form.register('account_number')} />
                </div>
                <div className="space-y-1.5">
                  <Label>계좌소유주</Label>
                  <Input {...form.register('account_holder')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>지급통화</Label>
                  <Input {...form.register('payment_currency')} />
                </div>
                <div className="space-y-1.5">
                  <Label>이메일</Label>
                  <Input type="email" {...form.register('contact_email')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>비고</Label>
                <Textarea {...form.register('notes')} rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>취소</Button>
                <Button type="submit" disabled={updateVendor.isPending} className="bg-primary hover:bg-primary-hover">
                  {updateVendor.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs mb-1">업체명</dt>
                <dd className="font-medium">{vendor.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">사업자번호</dt>
                <dd className="font-data">{vendor.business_number || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs mb-1">주소</dt>
                <dd>{vendor.address || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">은행</dt>
                <dd>{vendor.bank_name || '-'} {vendor.bank_code ? `(${vendor.bank_code})` : ''}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">계좌번호</dt>
                <dd className="font-data">{vendor.account_number || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">계좌소유주</dt>
                <dd>{vendor.account_holder || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">지급통화</dt>
                <dd className="font-data">{vendor.payment_currency}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">이메일</dt>
                <dd>{vendor.contact_email || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs mb-1">비고</dt>
                <dd className="whitespace-pre-wrap">{vendor.notes || '-'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
