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
import { vendorCreateSchema, type VendorCreate } from '@/lib/validations/vendor'
import { useCreateVendor } from '@/hooks/use-vendors'

export default function NewVendorPage() {
  const router = useRouter()
  const createVendor = useCreateVendor()

  const form = useForm<VendorCreate>({
    resolver: zodResolver(vendorCreateSchema),
    defaultValues: {
      name: '',
      business_number: '',
      address: '',
      bank_name: '',
      bank_code: '',
      account_number: '',
      account_holder: '',
      payment_currency: 'KRW',
      contact_email: '',
      notes: '',
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createVendor.mutateAsync(data)
      toast.success(`업체 "${result.name}" 등록 완료`)
      router.push(`/vendors/${result.id}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '등록 실패'))
    }
  })

  return (
    <div>
      <PageHeader title="업체 등록" />

      <form onSubmit={onSubmit}>
        <Card className="border-border max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">업체명 *</Label>
                <Input id="name" {...form.register('name')} placeholder="업체명" />
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

            {/* 은행/계좌 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">은행명</Label>
                <Input id="bank_name" {...form.register('bank_name')} placeholder="Kookmin, HSBC 등" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank_code">은행코드</Label>
                <Input id="bank_code" {...form.register('bank_code')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="account_number">계좌번호</Label>
                <Input id="account_number" {...form.register('account_number')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account_holder">계좌소유주</Label>
                <Input id="account_holder" {...form.register('account_holder')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="payment_currency">지급통화</Label>
                <Input id="payment_currency" {...form.register('payment_currency')} placeholder="KRW" />
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
              <Button type="submit" disabled={createVendor.isPending} className="bg-primary hover:bg-primary-hover">
                {createVendor.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
