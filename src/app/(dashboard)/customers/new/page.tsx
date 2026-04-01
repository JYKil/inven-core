'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/page-header'
import { customerCreateSchema, type CustomerCreate } from '@/lib/validations/customer'
import { useCreateCustomer } from '@/hooks/use-customers'

export default function NewCustomerPage() {
  const router = useRouter()
  const createCustomer = useCreateCustomer()

  const form = useForm<CustomerCreate>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      name: '',
      business_number: '',
      address: '',
      receipt_currency: 'USD',
      contact_email: '',
      notes: '',
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createCustomer.mutateAsync(data)
      toast.success(`고객 "${result.name}" 등록 완료`)
      router.push(`/customers/${result.id}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '등록 실패'))
    }
  })

  return (
    <div>
      <PageHeader title="고객 등록" />

      <form onSubmit={onSubmit}>
        <Card className="border-border max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">고객사명 *</Label>
                <Input id="name" {...form.register('name')} placeholder="고객사명" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business_number">사업자번호</Label>
                <Input id="business_number" {...form.register('business_number')} placeholder="000-00-00000" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">주소</Label>
              <Input id="address" {...form.register('address')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="receipt_currency">입금통화</Label>
                <Input id="receipt_currency" {...form.register('receipt_currency')} placeholder="USD" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">이메일</Label>
                <Input id="contact_email" type="email" {...form.register('contact_email')} />
                {form.formState.errors.contact_email && (
                  <p className="text-xs text-destructive">{form.formState.errors.contact_email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">비고</Label>
              <Textarea id="notes" {...form.register('notes')} rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
              <Button type="submit" disabled={createCustomer.isPending} className="bg-primary hover:bg-primary-hover">
                {createCustomer.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
