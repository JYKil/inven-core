'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { formatAmount, formatDate } from '@/lib/format'
import { useSalesOrders, type SoFilters } from '@/hooks/use-sales-orders'

export default function SalesOrdersContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<SoFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useSalesOrders(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="판매 주문">
        <Button render={<Link href="/sales-orders/new" />} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-1" />
          주문 생성
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="주문번호 검색..."
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, status: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{ all: '전체 상태', draft: '임시저장', confirmed: '확정', shipped: '출고완료', cancelled: '취소' }}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="confirmed">확정</SelectItem>
            <SelectItem value="shipped">출고완료</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>주문번호</TableHead>
              <TableHead>고객</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">매출 금액</TableHead>
              <TableHead>주문일</TableHead>
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
                    title="판매 주문이 없습니다"
                    actionLabel="첫 주문 생성하기"
                    actionHref="/sales-orders/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((so: any) => (
                <TableRow
                  key={so.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  onClick={() => router.push(`/sales-orders/${so.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/sales-orders/${so.id}`) }}
                >
                  <TableCell className="font-data font-medium">{so.order_number}</TableCell>
                  <TableCell>{so.customer?.name ?? '-'}</TableCell>
                  <TableCell><StatusBadge status={so.status} /></TableCell>
                  <TableCell className="font-data text-right">{formatAmount(so.total_amount)}</TableCell>
                  <TableCell className="font-data">{formatDate(so.order_date)}</TableCell>
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
