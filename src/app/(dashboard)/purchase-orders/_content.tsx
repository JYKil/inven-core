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
import { formatAmount, formatDate } from '@/lib/format'
import { usePurchaseOrders, type PoFilters } from '@/hooks/use-purchase-orders'

export default function PurchaseOrdersContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<PoFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = usePurchaseOrders(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="발주">
        <Button render={<Link href="/purchase-orders/new" />} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            발주 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="계약번호·업체명 검색..."
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, status: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{ all: '전체 상태', draft: '임시저장', confirmed: '확정', partially_received: '부분입고', received: '입고완료', cancelled: '취소' }}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="confirmed">확정</SelectItem>
            <SelectItem value="partially_received">부분입고</SelectItem>
            <SelectItem value="received">입고완료</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead className="w-1/5">계약일자</TableHead>
              <TableHead className="w-1/5">계약번호</TableHead>
              <TableHead className="w-1/5">업체명</TableHead>
              <TableHead>비고</TableHead>
              <TableHead className="text-right">합계</TableHead>
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
            ) : !data?.data.length ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title="발주가 없습니다"
                    actionLabel="첫 발주 등록하기"
                    actionHref="/purchase-orders/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((po: any) => (
                <TableRow
                  key={po.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  aria-label={`발주 ${po.po_number} 상세보기`}
                  onClick={() => router.push(`/purchase-orders/${po.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/purchase-orders/${po.id}`) }}
                >
                  <TableCell className="font-data">{formatDate(po.order_date)}</TableCell>
                  <TableCell className="font-data font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.vendor?.name ?? '-'}</TableCell>
                  <TableCell className="text-text-secondary">{po.notes || ''}</TableCell>
                  <TableCell className="font-data text-right font-medium">{formatAmount(po.total_amount)}</TableCell>
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
