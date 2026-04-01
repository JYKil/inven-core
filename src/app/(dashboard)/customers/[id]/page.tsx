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
import { customerUpdateSchema, type CustomerUpdate } from '@/lib/validations/customer'
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers'

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const { data: customer, isLoading } = useCustomer(id)
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

  const form = useForm<CustomerUpdate>({
    resolver: zodResolver(customerUpdateSchema),
  })

  const startEdit = () => {
    if (!customer) return
    form.reset({
      name: customer.name,
      business_number: customer.business_number ?? '',
      address: customer.address ?? '',
      receipt_currency: customer.receipt_currency,
      contact_email: customer.contact_email ?? '',
      notes: customer.notes ?? '',
    })
    setEditing(true)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateCustomer.mutateAsync({ id, ...data })
      toast.success('고객 수정 완료')
      setEditing(false)
    } catch (err) {
      toast.error(extractErrorMessage(err, '수정 실패'))
    }
  })

  const handleDelete = async () => {
    if (!confirm('이 고객을 비활성화하시겠습니까?')) return
    try {
      await deleteCustomer.mutateAsync(id)
      toast.success('고객 비활성화 완료')
      router.push('/customers')
    } catch (err) {
      toast.error(extractErrorMessage(err, '삭제 실패'))
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="고객 상세" />
        <Card className="border-border max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!customer) {
    return <div className="text-center py-16 text-muted-foreground">고객을 찾을 수 없습니다</div>
  }

  return (
    <div>
      <PageHeader title={editing ? '고객 수정' : customer.name}>
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
                  <Label>고객사명 *</Label>
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
                  <Label>입금통화</Label>
                  <Input {...form.register('receipt_currency')} />
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
                <Button type="submit" disabled={updateCustomer.isPending} className="bg-primary hover:bg-primary-hover">
                  {updateCustomer.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs mb-1">고객사명</dt>
                <dd className="font-medium">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">사업자번호</dt>
                <dd className="font-data">{customer.business_number || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs mb-1">주소</dt>
                <dd>{customer.address || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">입금통화</dt>
                <dd className="font-data">{customer.receipt_currency}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">이메일</dt>
                <dd>{customer.contact_email || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs mb-1">비고</dt>
                <dd className="whitespace-pre-wrap">{customer.notes || '-'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
