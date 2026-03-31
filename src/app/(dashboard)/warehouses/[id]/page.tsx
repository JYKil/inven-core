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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { warehouseUpdateSchema, type WarehouseUpdate } from '@/lib/validations/warehouse'
import { useWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/hooks/use-warehouses'

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const { data: wh, isLoading } = useWarehouse(id)
  const updateWarehouse = useUpdateWarehouse()
  const deleteWarehouse = useDeleteWarehouse()

  const form = useForm<WarehouseUpdate>({
    resolver: zodResolver(warehouseUpdateSchema),
  })

  const startEdit = () => {
    if (!wh) return
    form.reset({
      code: wh.code,
      name: wh.name,
      location: wh.location ?? '',
      phone: wh.phone ?? '',
      notes: wh.notes ?? '',
    })
    setEditing(true)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateWarehouse.mutateAsync({ id, ...data })
      toast.success('창고 수정 완료')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수정 실패')
    }
  })

  const handleDelete = async () => {
    if (!confirm('이 창고를 비활성화하시겠습니까?')) return
    try {
      await deleteWarehouse.mutateAsync(id)
      toast.success('창고 비활성화 완료')
      router.push('/warehouses')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="창고 상세" />
        <Card className="border-[#E0D8CF] max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!wh) return <div className="text-center py-16 text-[#9C9189]">창고를 찾을 수 없습니다</div>

  return (
    <div>
      <PageHeader title={editing ? '창고 수정' : `${wh.code} — ${wh.name}`}>
        {!editing && (
          <>
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1" />수정
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-[#B83A2A]">
              <Trash2 className="h-4 w-4 mr-1" />비활성화
            </Button>
          </>
        )}
      </PageHeader>

      <Card className="border-[#E0D8CF] max-w-2xl">
        <CardContent className="pt-6">
          {editing ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>창고코드 *</Label>
                  <Input {...form.register('code')} />
                </div>
                <div className="space-y-1.5">
                  <Label>창고명 *</Label>
                  <Input {...form.register('name')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>위치</Label>
                  <Input {...form.register('location')} />
                </div>
                <div className="space-y-1.5">
                  <Label>연락처</Label>
                  <Input {...form.register('phone')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>비고</Label>
                <Textarea {...form.register('notes')} rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>취소</Button>
                <Button type="submit" disabled={updateWarehouse.isPending} className="bg-[#D4642A] hover:bg-[#BF5520]">
                  {updateWarehouse.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-[#9C9189] text-xs mb-1">창고코드</dt>
                <dd className="font-data font-medium">{wh.code}</dd>
              </div>
              <div>
                <dt className="text-[#9C9189] text-xs mb-1">창고명</dt>
                <dd className="font-medium">{wh.name}</dd>
              </div>
              <div>
                <dt className="text-[#9C9189] text-xs mb-1">위치</dt>
                <dd>{wh.location || '-'}</dd>
              </div>
              <div>
                <dt className="text-[#9C9189] text-xs mb-1">연락처</dt>
                <dd>{wh.phone || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[#9C9189] text-xs mb-1">비고</dt>
                <dd className="whitespace-pre-wrap">{wh.notes || '-'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
