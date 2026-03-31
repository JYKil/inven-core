'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { StatusBadge } from '@/components/common/status-badge'
import { formatDate, formatQty, formatAmount } from '@/lib/format'
import { useAssemblyOrders, type AssemblyFilters } from '@/hooks/use-assembly-orders'

export default function AssemblyOrdersContent() {
  const [filters, setFilters] = useState<AssemblyFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useAssemblyOrders(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="조립 지시">
        <Button render={<Link href="/assembly-orders/new" />} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-1" />
          조립 생성
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="조립번호 검색..."
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, status: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{ all: '전체 상태', draft: '임시저장', completed: '완료', cancelled: '취소' }}
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>조립번호</TableHead>
              <TableHead>결과 품목</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead>조립 창고</TableHead>
              <TableHead>조립일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">총원가</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="조립 이력이 없습니다"
                    actionLabel="첫 조립 생성하기"
                    actionHref="/assembly-orders/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((ao: any) => (
                <TableRow key={ao.id}>
                  <TableCell>
                    <Link
                      href={`/assembly-orders/${ao.id}`}
                      className="font-data font-medium text-primary hover:underline"
                    >
                      {ao.order_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-data">{ao.product_item?.code}</span>
                    <span className="text-text-secondary ml-1">{ao.product_item?.name}</span>
                  </TableCell>
                  <TableCell className="font-data text-right">
                    {formatQty(Number(ao.quantity), ao.product_item?.unit)}
                  </TableCell>
                  <TableCell>{ao.warehouse?.name ?? '-'}</TableCell>
                  <TableCell className="font-data">{formatDate(ao.assembly_date)}</TableCell>
                  <TableCell><StatusBadge status={ao.status} /></TableCell>
                  <TableCell className="font-data text-right">
                    {ao.total_cost != null ? formatAmount(Number(ao.total_cost)) : '-'}
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
    </div>
  )
}
