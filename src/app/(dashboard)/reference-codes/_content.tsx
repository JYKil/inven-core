'use client'

import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import {
  useReferenceCodes,
  useReferenceCodeTypes,
  useCreateReferenceCode,
  useUpdateReferenceCode,
  useDeleteReferenceCode,
  type ReferenceCodeFilters,
} from '@/hooks/use-reference-codes'
import { ReferenceCodeDialog } from '@/components/reference-codes/reference-code-dialog'
import { extractErrorMessage } from '@/lib/api/error'
import type { Database } from '@/types/database'
import type { ReferenceCodeCreate, ReferenceCodeUpdate } from '@/lib/validations/reference-code'

type ReferenceCode = Database['public']['Tables']['reference_codes']['Row']

export default function ReferenceCodesContent() {
  const [filters, setFilters] = useState<ReferenceCodeFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useReferenceCodes(filters)
  const { data: types } = useReferenceCodeTypes()

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editTarget, setEditTarget] = useState<ReferenceCode | null>(null)

  const createMutation = useCreateReferenceCode()
  const updateMutation = useUpdateReferenceCode()
  const deleteMutation = useDeleteReferenceCode()

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  const handleCreate = () => {
    setDialogMode('create')
    setEditTarget(null)
    setDialogOpen(true)
  }

  const handleEdit = (row: ReferenceCode) => {
    setDialogMode('edit')
    setEditTarget(row)
    setDialogOpen(true)
  }

  const handleDelete = async (row: ReferenceCode) => {
    if (!confirm(`"${row.code_data1}" 항목을 삭제하시겠습니까?`)) return
    try {
      await deleteMutation.mutateAsync(row.id)
      toast.success('삭제 완료')
    } catch (err) {
      toast.error(extractErrorMessage(err, '삭제 실패'))
    }
  }

  const handleSubmit = async (formData: ReferenceCodeCreate | ReferenceCodeUpdate) => {
    try {
      if (dialogMode === 'create') {
        await createMutation.mutateAsync(formData as ReferenceCodeCreate)
        toast.success('기준정보 추가 완료')
      } else if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...formData })
        toast.success('기준정보 수정 완료')
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, '저장 실패'))
      throw err // 다이얼로그 닫기 방지
    }
  }

  return (
    <div>
      <PageHeader title="기준정보">
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-1" />
          추가
        </Button>
      </PageHeader>

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="데이터, 타입 검색..."
        />
        <Select
          value={filters.codeType ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, codeType: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{
            all: '전체 타입',
            ...(types ?? []).reduce((acc, t) => ({ ...acc, [t]: t }), {} as Record<string, string>),
          }}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="전체 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 타입</SelectItem>
            {(types ?? []).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead className="w-[12%] whitespace-nowrap truncate">타입</TableHead>
              <TableHead className="w-[18%] whitespace-nowrap truncate">데이터 1</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 2</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 3</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 4</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 5</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 6</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 7</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 8</TableHead>
              <TableHead className="whitespace-nowrap truncate">데이터 9</TableHead>
              <TableHead className="w-[70px] whitespace-nowrap">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <EmptyState
                    title="기준정보가 없습니다"
                    actionLabel="첫 기준정보 추가하기"
                    onAction={handleCreate}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  aria-label={`기준정보 ${row.code_type} ${row.code_data1} 편집`}
                  onClick={() => handleEdit(row)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(row) }}
                >
                  <TableCell className="font-medium truncate">
                    {row.code_type}
                  </TableCell>
                  <TableCell className="truncate">
                    {row.code_data1}
                  </TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data2 || '-'}</TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data3 || '-'}</TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data4 || '-'}</TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data5 || '-'}</TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data6 || '-'}</TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data7 || '-'}</TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data8 || '-'}</TableCell>
                  <TableCell className="text-text-secondary truncate">{row.code_data9 || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={`${row.code_data1} 수정`}
                        onClick={(e) => { e.stopPropagation(); handleEdit(row) }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        aria-label={`${row.code_data1} 삭제`}
                        onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <DataTablePagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.count}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      )}

      {/* 추가/수정 다이얼로그 */}
      <ReferenceCodeDialog
        open={dialogOpen}
        onOpenChange={(v) => { if (!v) setEditTarget(null); setDialogOpen(v) }}
        mode={dialogMode}
        initialData={editTarget}
        existingTypes={types ?? []}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
