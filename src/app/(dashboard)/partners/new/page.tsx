'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { PageHeader } from '@/components/common/page-header'
import { partnerCreateSchema, type PartnerCreate } from '@/lib/validations/partner'
import { useCreatePartner } from '@/hooks/use-partners'

export default function NewPartnerPage() {
  const router = useRouter()
  const createPartner = useCreatePartner()

  const form = useForm<PartnerCreate>({
    resolver: zodResolver(partnerCreateSchema),
    defaultValues: {
      name: '',
      partner_type: 'both',
      business_number: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createPartner.mutateAsync(data)
      toast.success(`거래처 "${result.name}" 등록 완료`)
      router.push(`/partners/${result.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '등록 실패'
      toast.error(msg)
    }
  })

  return (
    <div>
      <PageHeader title="거래처 등록" />

      <form onSubmit={onSubmit}>
        <Card className="border-[#E0D8CF] max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">업체명 *</Label>
                <Input id="name" {...form.register('name')} placeholder="업체명" />
                {form.formState.errors.name && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select
                  value={form.watch('partner_type')}
                  onValueChange={(v) => v && form.setValue('partner_type', v as PartnerCreate['partner_type'])}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="business_number">사업자번호</Label>
                <Input id="business_number" {...form.register('business_number')} placeholder="000-00-00000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">담당자명</Label>
                <Input id="contact_name" {...form.register('contact_name')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">연락처</Label>
                <Input id="phone" {...form.register('phone')} placeholder="000-0000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">주소</Label>
              <Input id="address" {...form.register('address')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">비고</Label>
              <Textarea id="notes" {...form.register('notes')} rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={createPartner.isPending}
                className="bg-[#D4642A] hover:bg-[#BF5520]"
              >
                {createPartner.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
