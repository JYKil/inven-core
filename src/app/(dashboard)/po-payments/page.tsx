'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { formatAmount, formatDate } from '@/lib/format'
import { usePoPayments } from '@/hooks/use-po-payments'
import type { ListFilters } from '@/lib/queries/keys'

export default function PoPaymentsPage() {
  const [filters, setFilters] = useState<ListFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = usePoPayments(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="지급 관리" />

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="PO번호 검색..."
        />
      </div>

      <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F5F0EB]/50">
              <TableHead className="text-xs font-medium text-[#6B6158]">PO번호</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">공급업체</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">지급일</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158] text-right">지급금액</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">방법</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">비고</TableHead>
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
                    title="지급 이력이 없습니다"
                    description="발주서 상세에서 지급을 등록할 수 있습니다"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((payment: any) => (
                <TableRow key={payment.id} className="h-9">
                  <TableCell className="text-[13px] font-data font-medium">
                    {payment.purchase_order?.po_number ?? '-'}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {payment.purchase_order?.partner?.name ?? '-'}
                  </TableCell>
                  <TableCell className="text-[13px] font-data">{formatDate(payment.payment_date)}</TableCell>
                  <TableCell className="text-[13px] font-data text-right">{formatAmount(payment.amount)}</TableCell>
                  <TableCell className="text-[13px] text-[#6B6158]">{payment.payment_method || '-'}</TableCell>
                  <TableCell className="text-[13px] text-[#6B6158]">{payment.notes || '-'}</TableCell>
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
