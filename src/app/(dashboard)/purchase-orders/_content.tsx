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
import { formatAmount, formatDate, formatPercent } from '@/lib/format'
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
      <PageHeader title="발주서(PO)">
        <Button render={<Link href="/purchase-orders/new" />} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            발주서 생성
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="PO번호 검색..."
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

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>PO번호</TableHead>
              <TableHead>공급업체</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">총 금액</TableHead>
              <TableHead>발주일</TableHead>
              <TableHead>예상입고일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="발주서가 없습니다"
                    actionLabel="첫 발주서 생성하기"
                    actionHref="/purchase-orders/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((po: any) => (
                <TableRow
                  key={po.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  onClick={() => router.push(`/purchase-orders/${po.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/purchase-orders/${po.id}`) }}
                >
                  <TableCell className="font-data font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.partner?.name ?? '-'}</TableCell>
                  <TableCell><StatusBadge status={po.status} /></TableCell>
                  <TableCell className="font-data text-right">{formatAmount(po.total_amount)}</TableCell>
                  <TableCell className="font-data">{formatDate(po.order_date)}</TableCell>
                  <TableCell className="font-data">{formatDate(po.expected_date)}</TableCell>
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
