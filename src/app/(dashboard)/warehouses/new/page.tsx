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
import { warehouseCreateSchema, type WarehouseCreate } from '@/lib/validations/warehouse'
import { useCreateWarehouse } from '@/hooks/use-warehouses'

export default function NewWarehousePage() {
  const router = useRouter()
  const createWarehouse = useCreateWarehouse()

  const form = useForm<WarehouseCreate>({
    resolver: zodResolver(warehouseCreateSchema),
    defaultValues: { name: '', address: '', contact: '', notes: '' },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createWarehouse.mutateAsync(data)
      toast.success(`창고 "${result.name}" 등록 완료`)
      router.push(`/warehouses/${result.id}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '등록 실패'))
    }
  })

  return (
    <div>
      <PageHeader title="창고 등록" />
      <form onSubmit={onSubmit}>
        <Card className="border-border max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">창고명 *</Label>
              <Input id="name" {...form.register('name')} placeholder="제1창고" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">창고주소</Label>
              <Input id="address" {...form.register('address')} placeholder="서울시 강남구..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">연락처</Label>
              <Input id="contact" {...form.register('contact')} placeholder="02-1234-5678 또는 email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">비고</Label>
              <Textarea id="notes" {...form.register('notes')} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
              <Button type="submit" disabled={createWarehouse.isPending} className="bg-primary hover:bg-primary-hover">
                {createWarehouse.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
