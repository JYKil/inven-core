'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { StatusBadge } from '@/components/common/status-badge'
import { formatDate } from '@/lib/format'
import { useGoodsReceipts, type GrFilters } from '@/hooks/use-goods-receipts'

export default function GoodsReceiptsContent() {
  const [filters, setFilters] = useState<GrFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useGoodsReceipts(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="입고 처리">
        <Button render={<Link href="/goods-receipts/new" />} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            입고 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="입고번호 검색..."
        />
      </div>

      <div className="border border-border rounded-[8px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>입고번호</TableHead>
              <TableHead>PO번호</TableHead>
              <TableHead>입고창고</TableHead>
              <TableHead>입고일</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title="입고 이력이 없습니다"
                    actionLabel="첫 입고 등록하기"
                    actionHref="/goods-receipts/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((gr: any) => (
                <TableRow key={gr.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/goods-receipts/${gr.id}`}>
                  <TableCell className="font-data font-medium">{gr.receipt_number}</TableCell>
                  <TableCell className="font-data text-text-secondary">
                    {gr.purchase_order?.po_number ?? '-'}
                  </TableCell>
                  <TableCell>{gr.warehouse?.name ?? '-'}</TableCell>
                  <TableCell className="font-data">{formatDate(gr.receipt_date)}</TableCell>
                  <TableCell><StatusBadge status={gr.status} /></TableCell>
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
    </div>
  )
}
