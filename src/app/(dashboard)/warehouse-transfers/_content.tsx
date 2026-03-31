'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { useWarehouseTransfers, type TransferFilters } from '@/hooks/use-warehouse-transfers'

export default function WarehouseTransfersContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<TransferFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useWarehouseTransfers(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="창고 이동">
        <Button render={<Link href="/warehouse-transfers/new" />} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-1" />
          이동 생성
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="이동번호 검색..."
        />
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>이동번호</TableHead>
              <TableHead>출발 창고</TableHead>
              <TableHead>도착 창고</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>이동일</TableHead>
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
                    title="이동 이력이 없습니다"
                    actionLabel="첫 이동 생성하기"
                    actionHref="/warehouse-transfers/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((t: any) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  onClick={() => router.push(`/warehouse-transfers/${t.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/warehouse-transfers/${t.id}`) }}
                >
                  <TableCell className="font-data font-medium">{t.transfer_number}</TableCell>
                  <TableCell>{t.from_warehouse?.name ?? '-'}</TableCell>
                  <TableCell>{t.to_warehouse?.name ?? '-'}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell className="font-data">{formatDate(t.transfer_date)}</TableCell>
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
