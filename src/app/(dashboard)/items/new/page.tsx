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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/page-header'
import { itemCreateSchema, type ItemCreate } from '@/lib/validations/item'
import { useCreateItem } from '@/hooks/use-items'

const unitOptions = ['EA', 'BOX', 'PCS', 'SET', 'ROLL', 'SHEET', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'MM']

export default function NewItemPage() {
  const router = useRouter()
  const createItem = useCreateItem()

  const form = useForm<ItemCreate>({
    resolver: zodResolver(itemCreateSchema),
    defaultValues: {
      code: '', name: '', category: '', unit: 'EA',
      item_type: 'basic', description: '', min_stock_qty: 0,
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createItem.mutateAsync(data)
      toast.success(`품목 "${result.name}" 등록 완료`)
      router.push(`/items/${result.id}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '등록 실패'))
    }
  })

  return (
    <div>
      <PageHeader title="품목 등록" />
      <form onSubmit={onSubmit}>
        <Card className="border-border max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">품목코드 *</Label>
                <Input id="code" {...form.register('code')} placeholder="ITEM-001" />
                {form.formState.errors.code && (
                  <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">품목명 *</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select
                  value={form.watch('item_type')}
                  onValueChange={(v) => v && form.setValue('item_type', v as ItemCreate['item_type'])}
                  items={{ basic: '기초 품목', assembly: '조립 품목' }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">기초 품목</SelectItem>
                    <SelectItem value="assembly">조립 품목</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>단위 *</Label>
                <Select
                  value={form.watch('unit')}
                  onValueChange={(v) => v && form.setValue('unit', v)}
                  items={Object.fromEntries(unitOptions.map((u) => [u, u]))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">카테고리</Label>
                <Input id="category" {...form.register('category')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min_stock_qty">최소 재고 수량 (알람용)</Label>
              <Input id="min_stock_qty" type="number" step="any" {...form.register('min_stock_qty', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">설명</Label>
              <Textarea id="description" {...form.register('description')} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
              <Button type="submit" disabled={createItem.isPending} className="bg-primary hover:bg-primary-hover">
                {createItem.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
